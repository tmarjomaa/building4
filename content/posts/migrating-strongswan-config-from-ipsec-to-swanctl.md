---
author: "Tommi Marjomaa"
title: "Migrating Strongswan config from ipsec.conf to swanctl.conf"
linktitle: "Migrating Strongswan config from ipsec.conf to swanctl.conf"
description: "In this blog post I'll show you how to migrate Strongswan config from legacy ipsec.conf to swanctl.conf"
date: "2023-08-04T12:00:00+03:00"
tags: ["azure", "raspberrypi", "strongswan", "vpngw"]
draft: false
---
Remember one of my [older blog post](/posts/building-site2site-vpn-to-azure-using-raspberrypi) where I built a site-to-site vpn between Azure and my home office using Raspberry Pi? If you've been following me in social media, you would already know what happened a day later. My router broke. So it was really nice that I had a sort of checklist of what I needed to do on the router's config. 

After the blog post I got some feedback that ipsec.conf is the legacy way and I should migrate to swanctl.conf. So in this blog post I'll show you how to migrate Strongswan config from legacy ipsec.conf to swanctl.conf.

## First things first

I'm going to need to install some new packages while upgrading. And as I didn't want the old config to start haunting me while setting up the new config, I started by removing the unnecessary strongswan packages. Didn't even really need those old config files, as they were in GitHub and in the previous post.

After removing the packages I needed some new packages, mainly  ```strongswan-swanctl``` and ```charon-systemd```. 


```bash
$ sudo dpkg -r strongswan strongswan-starter strongswan-charon 
$ sudo apt install strongswan-swanctl charon-systemd libcharon-extra-plugins strongswan-libcharon
```

Note, I originally thought that it would be sufficient to use ```strongswan-charon``` package, but it didn't provide me necessary daemons. Thus I ended up using *charon-systemd* package. Before switching the package, I was receiving the following error when trying to run any command using ```swanctl``` ([docs](https://docs.strongswan.org/docs/5.9/swanctl/swanctl.html)). 

*Connecting to 'unix:///var/run/charon.vici' failed: No such file or directory*.

## Upgrading the config

Before we check the new confgiuration file, I'll point out that the new configuration file is located at ```/etc/swanctl/swanctl.conf``` ([docs](https://docs.strongswan.org/docs/5.9/swanctl/swanctlConf.html)). There's also a [migration guide on Strongswan wiki](https://wiki.strongswan.org/projects/strongswan/wiki/Fromipsecconf), which I needed to study a bit to understand the differences between the old configuration file and the new. At first I had some problems, but after some trial-and-error, I managed to map all necessary key-value pairs.

In the old configuration we had two files (```ipsec.conf```and ```ipsec.secrets```), now it's all in the same config. I'll put the old config here, so that it's easier to compare the changes.

```bash
# ipsec.conf - strongSwan IPsec configuration file
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

# ipsec.secrets - holds shared secrets or RSA private keys for authentication.
192.168.10.6 building4cloud-vpngw-prod.westeurope.cloudapp.azure.com : PSK "4Ocf4m5P66ui+qiD+LAEtyFt0F="
```

And here's the new config.

```bash
connections {
    homeoffice-s2s-azure {
        version = 2
        local_addrs = 192.168.10.36
        remote_addrs = building4cloud-vpngw-prod.westeurope.cloudapp.azure.com
        local_port = 4500
        remote_port = 4500
        proposals = aes256-sha2_256-prfsha256-modp1024
        keyingtries = 0
        dpd_delay = 30s
        local {
            auth = psk
            id = 192.168.10.36
        }
        remote {
            auth = psk
            id = 20.229.166.129
        }
        children {
            vpn {
                mode = tunnel
                local_ts = 192.168.10.0/24
                remote_ts = 10.112.0.0/21
                dpd_action = start
                start_action = start
                esp_proposals = aes256-sha2_256
            }
        }
    }
}

secrets {
    ike-1 {
        id-1 = 192.168.10.36
        id-2 = 20.229.166.129
        secret = 4Ocf4m5P66ui+qiD+LAEtyFt0F=
    }
}
```

Although the configurationfiles are structured differently, it's still fairly easy to map most of the values between the two, especially when using the migration guide linked earlier. Note that I have removed some of the values that existed in the old config. Mostly because they are currentle the default values or not needed at all.

Few notes of the migration and mapping process: 
1. In *ipsec.conf* we had left and right, no we have *local* and *remote*. 
2. Ciphers and algorithms don't use exclamation mark (```!```) any more for restriction.
3. How to use the id's in the secrets was where I struggled the most. Luckily I found some examples [here](https://www.strongswan.org/testing/testresults/ikev2/net2net-psk/). I ended up using the ip-address of the Azure vpn gw, as it seems to provide me the most reliable connections. Of course it means that I need to adjust them if/when creating the vpn gateway fron scratch. It's not a big thing to do, and could be scripted easily :D. Anyways, I need to adjust my firewall as I'm only opening it for the gateway's current public ip.

## Making sure it works

After saving the configuration file, let's make sure we ca get the tunnel up.

```bash 
$ sudo systemctl enable strongswan.service
$ sudo systemctl restart strongswan.service
$ sudo systemctl status strongswan.service
```
The output should be similar to the following lines, from which we can also map the names of IKE_SA and CHILD_SA to the configuration-file.

```bash
IKE_SA homeoffice-s2s-azure[1] established between 192.168.10.36[192.168.10.36]...20.229.166.129[20.229.166.129]
...
CHILD_SA vpn{1} established with SPIs ... and TS 192.168.10.0/24 === 10.112.0.0/21
```

To double-check we can quickly create a test vm in Azure. This time we'll use an existing ssh public key.

```bash
SUBNETID=$(az network vnet subnet show --resource-group hub-vnet-prod --name SharedServicesSubnet --vnet-name hub-vnet-prod --query="id" -o tsv)
az vm create --resource-group vm-test --name vm2 --location westeurope --image debian --admin-username b4cloudadmin --ssh-key-values ./id_rsa.pub --size Standard_B2s --public-ip-address "" --nsg "" --subnet $SUBNETID
```

Let's grab the private ip of the vm and ssh into it.

```bash
VMIP=$(az vm show --show-details --resource-group vm-test --name vm2 --query privateIps --output tsv)
ssh b4cloudadmin@$VMIP
```

And we're in! The tunnel is up and running just like it should.

## What did we do?

In this blog post we went through the process of migrating strongSwan's configuration from legacy ipsec.conf to swanctl.conf. We started by removing unnecessary packages before installing few new packages. Then we compared differences between the old and new config files, and checked the mapping of the values between the files. Finally we checked that the tunnel works with the migrated configuration.

Before heading up to the next tasks, I'll kindly remind you to delete any unnecessary resources in Azure. Such as the test vm if you were following up.