---
author: "Tommi Marjomaa"
title: "Having a first look of the Service Retirement workbook (preview)"
linktitle: "Having a first look of the Service Retirement workbook (preview)"
description: "We all know how rapidly all public cloud providers like to introduce new features and services. At the same time some of the old stuff needs to go. It's sometimes hard to keep up and follow all those services getting the boot. Luckily there's a new Service Retirement workbook in preview. Let's have a look."
date: "2023-10-03T18:00:00+03:00"
tags: ["azure", "workbooks", "azureadvisor"]
draft: false
---
![A view of the Service Retirement workbook](/images/service-retirement-header.png)

We all know how rapidly all public cloud providers like to introduce new features and services. At the same time some of the old stuff needs to go. It's sometimes hard to keep up and follow all the communication channels to ensure you're not running any services or features that are about to get the boot.

I was happy to notice that [Microsoft announced](https://techcommunity.microsoft.com/t5/azure-governance-and-management/announcing-the-public-preview-of-service-retirement-workbook-in/ba-p/3848168) in middle of the summer a public preview of Service Retirement workbook, which, by Microsoft's definition, *provides a single centralized resource level view of service retirements that may require customer action to mitigate*.

Sounds promising. Let's take look.

We can find the workbook by visiting Azure Portal - more specifically the Workbooks section of Azure Advisor. There are few other workbooks as well.

![Service Retirement workbook is among few other workbooks available in Azure Advisor](/images/advisor-workbooks.png)

Just click to open the workbook, no need to install it anywhere. Once opened you can see those retiring Azure services that are relevant to your environment. I have a relatively small Azure footprint, so there isn't much to see. But still few affected resources.

![List of retiring Azure services](/images/advisor-retiring-services.png)

Luckily the retirement dates for affected services are not in the near future. Still, I need to start planning on [migrating to workspace-based Application Insights](https://learn.microsoft.com/en-gb/azure/azure-monitor/app/convert-classic-resource) before 29 February 2024.

In case you want to see all services doomed for retirement, you can use the toggle to change the view.

![Toggle for switching the view between all services and only affected services.](/images/advisor-filters.png)

It really isn't a big surprise that there are loads of Classic resources soon to retire. Those services and features that have already been retired, or are really close of being retired, are marked with a red line.

![A list of all really soon-to-retire services](/images/advisor-retiring-services-all.png)

One thing to note here, and also mentioned in the workbook's description is that *currently, the workbook contains information for subset of services and features that are in the retirement lifecycle*. So, you can't just rely on the information shown in the workbook to be on the safe side.

So, better monitor those service retirement updates on [Azure updates](https://azure.microsoft.com/en-gb/updates/?updateType=retirements). And perhaps you should also follow Service Health advisories. I even encourage you to set up Service Health alerts for those advisories.

![A list of two service health advisories](/images/service-health-advisories.png)

Looks like I need to do some work with updating Cosmos DB extension version for an Azure Function and the way I collect activity logs.

## Lastly

Altough the workbook is far away being a finished, polished one-stop solution to follow all soon-to-retire services, I'm looking forward to find out how it evolves as time goes by.