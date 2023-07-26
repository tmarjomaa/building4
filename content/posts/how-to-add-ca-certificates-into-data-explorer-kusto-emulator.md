---
author: "Tommi Marjomaa"
title: "How to add CA certificates into Data Explorer Kusto emulator docker image"
linktitle: "How to add CA certificates into Data Explorer Kusto emulator docker image"
description: "In this blog post I will be building a custom Azure Data Explorer Kusto emulator docker image that can connect to https endpoints."
date: "2023-07-26T12:00:00+03:00"
tags: ["azure", "azuredataexplorer", "docker", "kusto", "kql"]
draft: false
---
Remember my [previous blog post](/posts/lets-give-azure-data-explorer-kusto-emulator-a-spin-in-wsl) where I was spinning up Azure Data Explorer Kusto emulator in WSL? During the test I had problems ingesting data from https. Let's see if we can fix that.

## What was the problem?

I was trying to ingest [Kusto Detective Agency's](https://detective.kusto.io/) data set from the Season 2 Onboarding case, but all I got was these error messages stating "*Failed to download blob: The SSL connection could not be established, see inner exception.*"

```Kusto
// Load the data:
.ingest async into table DetectiveCases (@'https://kustodetectiveagency.blob.core.windows.net/kda2start/log_00000.csv.gz')
.ingest async into table DetectiveCases (@'https://kustodetectiveagency.blob.core.windows.net/kda2start/log_00001.csv.gz')
.ingest into table DetectiveCases (@'https://kustodetectiveagency.blob.core.windows.net/kda2start/log_00002.csv.gz')
```

No matter how hard I tried, I could ingest data using https. So I decided to failback to hosting the data on a separate storage account that allowed insecure http-connections.

## A hypothesis and some docker magic

I hypothesize that the error is caused by the fact that the CA certificates are not shipped with the docker image. I could not attach to a running image simply by using ```docker attach```. It would have been too easy to check what's inside the container. But I could obviously run ```docker inspect``` and get some nice detailed information of the image. One of the labels tells that the original base image used is [CBL-Mariner](https://mcr.microsoft.com/en-us/product/cbl-mariner/base/core/about), which is an internal Linux distribution for Microsoft’s cloud infrastructure and edge products and services.

```
"image.base.ref.name": "mcr.microsoft.com/cbl-mariner/base/core:2.0"
```

That wasn't the only thing that caught my eye, but let's focus on those a bit later. Anyways, if I want to try and get those missing CA certificates installed to the image, I need to build my own docker image based on the emulator image. There might be better ways of doing this, as by no means am I a Docker guru, but I do know enough of the basics to get started with writing a simple Dockerfile. And I know how where [Dockerfile reference](https://docs.docker.com/engine/reference/builder/) documentation is located :)

So, let's start with the Dockerfile. The first thing we need is the base image used. That's easy as we have already used it when spinning up the emulator.

```
FROM mcr.microsoft.com/azuredataexplorer/kustainer-linux:latest
```

Next we would like to install CA certificates (package ca-certificates). Let's add that.

```
RUN yum install -y ca-certificates
```

We don't necessary need labels, but let's add one for fun.

```
LABEL version="0.1-building4cloud"
```

We know from the previous runs that the docker image exposes port 8080. We can also see that from ```docker inspect``` output.

```
"ExposedPorts": {
    "8080/tcp": {}
}
```

Let's use it.

```
EXPOSE 8080/tcp
```
We can also see information about the environment variables from the output.

```
"Env": [
    "ACCEPT_EULA=Y",
    "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
    "TZ=Europe/London"
]
```

Most probably *ACCEPT_EULA* is not originally set to *Y*, as it's set during the image launch, but I'll set it to "Y", so that it's not needed when running the container.

```
ENV ACCEPT_EULA="Y"
ENV PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
ENV TZ="Europe/London"
```

And the last thing we need is *ENTRYPOINT*, which allows us to configure the container to be run as an executable. We can get the information from the output as well.

```
"Entrypoint": [
    "/bin/sh",
    "-c",
    "/start-kusto.sh"
]
```

After adding the last part, we end up with a Dockerfile looking like this.

```
FROM mcr.microsoft.com/azuredataexplorer/kustainer-linux:latest
RUN yum install -y ca-certificates
LABEL version="0.1-building4cloud"
EXPOSE 8080/tcp
ENV ACCEPT_EULA="Y"
ENV PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
ENV TZ="Europe/London"
ENTRYPOINT ["/bin/sh", "-c", "/start-kusto.sh"]
```

## Building and spinning up the building4cloud emulator

Now that the Dockerfile is created, it needs to be build using *docker build* ([docs](https://docs.docker.com/engine/reference/commandline/build/)). It's simple as running the following command in the same folder where the Dockerfile is located.

```bash
$ docker build -t kustainer-linux:0.1-building4cloud .
```

After a short period the image is ready and we can list it using ```docker image ls```.

```bash
$ docker image ls
REPOSITORY         TAG                  IMAGE ID       CREATED          SIZE
kustainer-linux    0.1-building4cloud   ae6f28babea8   44 seconds ago   2.37GB
```

Let's give it a try and run it. Remember to kill the original image, if you have it running. This allows using port 8080 and there's no need to change the configuration of the Kusto.Explorer. NOTE that killing the container means that you will lose all the data that resides in the memory of the original emulator container! Save it somewhere if it's important.

```bash
$ docker run -m 4G -d -p 8080:8080 -t kustainer-linux:0.1-building4cloud```
```

Let's fire up Kusto.Explorer and see if we can ingest data this time from https-endpoints. You might need to refresh the view on 

```Kusto
.execute database script <|
// Create a table for the telemetry data:
.create table DetectiveCases(Timestamp:datetime, EventType:string, DetectiveId:string, CaseId: string, Properties:dynamic)
//clear any previously ingested data if such exists
.clear table DetectiveCases data
// Load the data:
.ingest async into table DetectiveCases (@'https://kustodetectiveagency.blob.core.windows.net/kda2start/log_00000.csv.gz')
.ingest async into table DetectiveCases (@'https://kustodetectiveagency.blob.core.windows.net/kda2start/log_00001.csv.gz')
.ingest into table DetectiveCases (@'https://kustodetectiveagency.blob.core.windows.net/kda2start/log_00002.csv.gz')
```

And guess what? It works.

## Final words

In this blog post I walked through how to install a new package (ca-certificates) to Azure Data Explorer Kusto emulator docker image. To purpose for this was to enable https communication to data files hosted in Azure Storage Accounts. It was all made possible by utilizing docker inspect to get enough information for creating and building a new image using a Dockerfile.

I hope this was useful and maybe you even learned something new. I certainly did. Until next time.