---
author: "Tommi Marjomaa"
title: "Building a Site-to-Site VPN to Azure using Raspberry Pi"
linktitle: "Building a Site-to-Site VPN to Azure using Raspberry Pi"
description: "In this blog article I will be building a site-to-site vpn between my home office and Azure using a Raspberry Pi."
date: "2023-06-24T12:00:00+03:00"
tags: ["azure", "raspberrypi", "strongswan", "vpngw", "bicep", "CLI"]
draft: false
---
There are times when I need to use or test something in Azure using a private and secure connection from my home office. This is where VPN connections come into the picture. I had an extra Raspberry Pi laying around and decided to use it as a vpn gateway for the site-to-site connection.

First we'll take a look of the overall architecture. Then we'll dig into provisioning the Azure resources, configuring the Raspberry Pi and the home office network. Lastly we'll make sure that the vpn tunnel is established and working. 

## Overall architecture
The overall architecture is pretty simple. In Azure I have a traditional hub-and-spoke network architecture and at the home office I have a standard router from a local operator, a Raspberry Pi and some other devices that will be connecting to Azure resources through the vpn tunnel. As the router is in front of the Raspberry Pi, there's some work that needs to be done on the router. But let's get back to that a bit later.

![Overall architecture](/images/raspi-vpn-overall-architecture.png)

For this article we can assume that I have a home network of ```192.168.10.0/24``` and that I have reserved ```10.112.0.0/21``` network for Azure use.

As the deployment of the vpn gateway will take some (typically 45 mins or so), we'll start with setting up Azure side.

## Setting up Azure resources

We need to make sure we have the hub vnet ready with a subnet called GatewaySubnet (Yes, you need to name it like that!). I have also added two additional subnets to the template, one for Azure Bastion and another for shared resources. To keep it simpler I haven't included any spoke vnets and peerings. You can find the templates files from [GitHub](https://github.com/tmarjomaa/templates/tree/master/hub-and-spoke). 

So, let's create the hub vnet using az cli & bicep cli. Note that I'm using [.bicepparam parameter files](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/parameter-files?tabs=Bicep) to pass necessary parameters. You need to be using Bicep CLI version 0.18.4 or newer with them.

```bash
$ az login
$ az account set --subscription <subscriptionid>
$ az group create --name hub-vnet-prod --location westeurope --tags owner=tommi@building4.cloud
$ az deployment group create --name hub-vnet-deployment --resource-group hub-vnet-prod --template-file hub-vnet-prod.bicep --parameters hub-vnet-prod.bicepparam
```

That shouldn't take too long. After the vnet is created, it's time to create the vpn gateway and some additional resources: a public ip for the vpn gateway, a local network gateway representing home office, and the site-to-site connection resource. 

As the current public ip of the home office is needed for the local network gateway, I'll just grab it using ```curl```. I could of course use a dynamic dns service and use a fqdn host name, but let's continue with an ip this time. If you look at the the [template file](https://github.com/tmarjomaa/templates/tree/master/vpngw-s2s-homeoffice), you can see that I'm using a Basic SKU as that fits my needs, and is the cheapest option as well. You can read more about the SKUs and their differences on [MS Learn](https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-about-vpngateways#gwsku). I have set a fqdn (```building4cloud-vpngw-prod.westeurope.cloudapp.azure.com```) to the vpn gateway's public ip.

Note that I have removed the values of shared key (param sharedKey) and home office public ip (param homeOfficePublicIpAddress) from the parameters file. Those will be needed of course.

```bash
$ curl ifconfig.me
$ az deployment group create --name vpngw-deployment --resource-group hub-vnet-prod --template-file vpngw-prod.bicep --parameters vpngw-prod.bicepparam
```

Now that we have kicked off the deployment, we can start looking at the home office side. 

## Setting up things at home office

As I have the router in front of the Raspberry Pi, I need to make some configuration on the router.
1. Making sure that necessary ports (UDP 500 and UDP 4500) are allowed through the firewall and forwarded to the Raspberry Pi. 
2. Making sure traffic destined to Azure vnet is routed to Raspberry Pi.

Once those are done we can then log in to the Raspberry Pi and finish up it's configuration. 
Installing strongswan to the Raspberry Pi is as simple as this. 

```bash
$ sudo apt update && sudo apt upgrade -y
$ sudo apt install strongswan
```

After installing strongswan let's stop for a moment to check some of the necessary bits and pieces. First we need to make sure that packet forwarding is enabled by uncommenting the following line in ```/etc/sysctl.conf```.

```bash
net.ipv4.ip_forward=1
```

Then we need to make some configuration on ```/etc/ipsec.conf``` and ```/etc/ipsec.secrets```. Official documentation for both files can be found [here](https://wiki.strongswan.org/projects/strongswan/wiki/IpsecConf) and [here](https://wiki.strongswan.org/projects/strongswan/wiki/IpsecSecrets).

Let's make some configuration in ```/etc/ipsec.conf``` next.

```bash
# ipsec.conf - strongSwan IPsec configuration file

# basic configuration
config setup
        charondebug="all"
        strictcrlpolicy=no
        uniqueids=yes

# Add connections here.
conn homeoffice-to-azure
        leftauth=psk
        left=%defaultroute
        leftikeport=4500
        leftsubnet=192.168.10.0/24
        rightauth=psk
        right=building4cloud-vpngw-prod.westeurope.cloudapp.azure.com
        rightid=%any
        rightsubnet=10.112.0.0/21
        rightikeport=4500
        ike=aes256-sha2_256-prfsha256-modp1024!
        esp=aes256-sha2_256!
        keyingtries=0
        ikelifetime=1h
        lifetime=8h
        dpddelay=30
        dpdtimeout=120
        dpdaction=restart
        auto=start
```
Nothing much to see here. I'll shortly go trough the connection ([conn](https://wiki.strongswan.org/projects/strongswan/wiki/IpsecConf)) configration. Left is home office, and right is Azure, which is quite self-explanatory when looking at the values. We can see that ```right``` has been set to the fqdn I configured for the public ip attached to the vpn gateway, and the ```rightsubnet``` has been set to the whole Azure network reservation mentioned earlier. Same goes with ```leftsubnet``` which is set to the home office network mentioned earlier. Also note that when using a fqdn for right, you need to set ```rightid=%any```, meaning that the host behind the fqdn can have any ip address. Same applies for ```left``` and ```leftid``` too.

Lastly I'll shortly explain ```ìke``` and ```esp``` values. The values represent selected encryption/authentication algorithms that'll be used for the vpn tunnel between Azure and home office. In case you want to use something else, look [here](https://docs.strongswan.org/docs/5.9/config/IKEv2CipherSuites.html) for strongswan and [here](https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-about-compliance-crypto#custom-ipsecike-policy-with-azure-vpn-gateways) for Azure ciphers. The exclamation mark (```!```) in the end means that the responder is restricted to those values.

In the ```/etc/ipsec.secrets``` file we need to configure the shared secret for the connection.

```bash
# This file holds shared secrets or RSA private keys for authentication.
192.168.10.6 building4cloud-vpngw-prod.westeurope.cloudapp.azure.com : PSK "4Ocf4m5P66ui+qiD+LAEtyFt0F="
```

First we have the ip address of the Raspberry Pi, then the fqdn of the vpn gateway, PSK tells it's a Pre-Shared Key, and lastly we have the actual secret. And in case you're wondering those aren't actually in use at the moment :).

Once we are done with the configuration, it's time to check that it actually works.

## Let's check that everything works

Let's run few commands to make sure everything is working as expected.

```bash
$ sudo ipsec restart
$ sudo ipsec status
```

The first command restarts the daemon and should automatically bring up the tunnel. While the second one should show us that the tunnel is up and running. You should be seeing something that looks like the following:

```bash
Security Associations (1 up, 0 connecting):
homeoffice-to-azure[10]: ESTABLISHED 21 minutes ago, 192.168.10.6[192.168.10.6]...20.229.166.129[20.229.166.129]
homeoffice-to-azure{5}:  INSTALLED, TUNNEL, reqid 1, ESP in UDP SPIs: ca010b21_i 787618c8_o
homeoffice-to-azure{5}:   192.168.10.0/24 === 10.112.0.0/21
```

You can also use ```sudo ipsec statusall``` to see more information about the algorithms in use (which should match the ones set in ipsec.conf).

```bash
homeoffice-to-azure[10]: IKE proposal: AES_CBC_256/HMAC_SHA2_256_128/PRF_HMAC_SHA2_256/MODP_1024
homeoffice-to-azure{5}:  AES_CBC_256/HMAC_SHA2_256_128, 0 bytes_i, 0 bytes_o, rekeying in 7 hours
```

Finally let's deploy a test vm in Azure and check that the tunnel actually works. I'll be using the SharedServicesSubnet created in the hub vnet.

```bash 
SUBNETID=$(az network vnet subnet show --resource-group hub-vnet-prod --name SharedServicesSubnet --vnet-name hub-vnet-prod --query="id" -o tsv)
$ az group create --name vm-test --location westeurope --tags owner=tommi@building4.cloud
$ az vm create --resource-group vm-test --name vm1 --location westeurope --image debian --admin-username b4cloudadmin --generate-ssh-keys --size Standard_B2s --public-ip-address "" --nsg "" --subnet $SUBNETID
```

Once the vm is created, it's private ip will be in the output (```"privateIpAddress": "10.112.0.36"```). To make sure the tunnel works, we can always use ping, or we can use the ssh keys just generated and access the vm.

```bash
$ ssh b4cloudadmin@10.112.0.36
$ uname -a
Linux vm1 4.19.0-24-cloud-amd64 #1 SMP Debian 4.19.282-1 (2023-04-29) x86_64 GNU/Linux
```

## Last words

In this article I demonstrated how to create a hub vnet and a vpn gateway in Azure using Bicep. I also configured necessary bit and pieces in the home office router and the Raspberry Pi to get the vpn tunnel up and running between Azure and home office. Finally I created a test vm to check that tunnel works. 

Remember to delete all the created resources from Azure if you don't need them! 