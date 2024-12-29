---
author: "Tommi Marjomaa"
title: "Running LLMs locally with ollama"
linktitle: "Running LLMs locally with ollama"
description: "If you've been thinking about experimenting with large language models locally, but haven't yet started, you're in the right place. In this blog psost I'll show how you can run LLMs locally using Ollama."
date: "2024-12-29T12:00:00+03:00"
tags: ["genai", "llm", "wsl", "ollama"]
draft: false
---

![A llama using a workstation to run large language models locally!](/images/llama.png)

I'm sure you have interacted with LLMs through online services like OpenAI's ChatGPT. You might even have experience from multiple services and various models. And while you have been utlizing those services, you might have been wondering if you could run large language models on your laptop. That's something I can help you with. In this blog post I'll show you an easy way to run LLMs using Ollama.

## Why Run LLMs Locally?

Well, why not? Running models locally ensures **privacy** as you have complete control over your data and you can be confident that sensitive never leaves your environment, minimizing exposure to potential breaches. You'll also have greater control over **tailoring** and fine-tuning the model's behavior to adapt your specific needs without the constraints of pre-packaged cloud solutions. For long-term, intensive use cases, local deployments can be more **cost-effective** than recurring cloud service fees. Local execution can reduce **latency**, providing faster response times compared to cloud-based solutions. Or maybe you have an unreliable network connection and still need to develop your AI-powered app offline. And if nothing else, it's always fun to **learn and experiment** with something new.

## Setting up Ollama

Installing Ollama in WSL is straightforward. As you should't just run all random scripts that are linked in blog posts, you can and should check [the source of the script](https://github.com/ollama/ollama/blob/main/scripts/install.sh) first.

```bash
$ curl -fsSL https://ollama.com/install.sh | sh
```
Once Ollama is installed, you can verify that ollama is running by either heading over to http://localhost:11434 using a browser, or you can just curl it. 

```bash 
$ curl http://localhost:11434
Ollama is running
```  

## Pulling a model

Ollama supports a broad range of pre-trained models. Choose the one that best fits your use case, whether it’s Phi, Mistral, Llama, Gemma... an up-to-date list is available on https://ollama.com/library. Let's pick Google's Gemma2 with 2 billion parameters. It should be quite usable with a laptop without GPU. 

```bash
$ ollama pull gemma2:2b
pulling manifest
pulling 7462734796d6... 100% ▕██████████████████████████████████████▏ 1.6 GB
pulling e0a42594d802... 100% ▕██████████████████████████████████████▏  358 B
pulling 097a36493f71... 100% ▕██████████████████████████████████████▏ 8.4 KB
pulling 2490e7468436... 100% ▕██████████████████████████████████████▏   65 B
pulling e18ad7af7efb... 100% ▕██████████████████████████████████████▏  487 B
verifying sha256 digest
writing manifest
success
```
Once the model is pulled from the registry, we can run it and start interacting with it.

## Interacting with a model

Running an model and interacting with it is straightforward.

```bash
$ ollama run gemma2:2b
>>> Send a message (/? for help)

>>> write me one lead paragraph for a blog post titled "Running LLMs locally with Ollama"

Want to unlock the power of cutting-edge language models without relying on external servers or waiting for slow API calls?  Ollama provides the solution! This guide takes you through the process of deploying and running powerful LLMs on your own hardware, empowering you to harness the potential of AI right where it matters most.
```

If you want to influence the model's output, feel free to experiment with the model's configuration and adjust the temperature and/or system message.

```bash
>>> /set parameter temperature 1.0
Set parameter 'temperature' to '1.0'

>>> write me one lead paragraph for a blog post titled "Running LLMs locally with Ollama"

Tired of waiting in queues, watching your requests hang while searching for an answer? Running powerful AI models like large language models (LLMs) directly on your own hardware is no longer just science fiction. With the introduction of Ollama, this dream has become a reality. This guide demystifies the process, turning you into a master of local AI, ready to leverage its full potential.

>>> /set system "You are an English Literature Professor. Your responses are eloquent, insightful, and enriched with poetic depth, capturing the essence of literary artistry."
Set system message.

>>> write me one lead paragraph for a blog post titled "Running LLMs locally with Ollama"

In the realm of artificial intelligence, where language itself becomes the brushstrokes of creation, we find a symphony of code and algorithms yearning to be unleashed. For too long, the allure of these powerful language models has felt like a whispered dream, a celestial dance confined to distant servers. But now, thanks to Ollama's ingenious design, we stand poised to translate those aspirations into tangible reality.  This guide acts as a conduit, illuminating the path towards unlocking the full potential of AI - right on your very own desktop.
```

You can use ```/bye``` to exit the chat.

If you just want the ouput from a model without chatting, you can just send your request to the model together with the run command.

```bash
$ ollama run gemma2:2b "What is cloud computing?"

Imagine a big, shared network of computers (servers) that are constantly running and storing data for anyone to use – like an online toolbox. That's essentially what cloud computing is!
```

Depending on the model used, we can even add images to the conversation and ask questions about it. Let's see what can we get out of the header image.

```bash
>>> "Which items are on the desk in this picture?" "./llama.png"
Added image './llama.png'
The image shows a llama sitting at a desk with a computer monitor and keyboard. The llama is likely a developer or programmer, given its familiarity with the code displayed on the screen.

Here are some of the items that appear to be on the desk:

* A computer monitor displaying lines of code
* A keyboard for typing
* A mug or cup, possibly containing coffee or tea
* A small plant or succulent in a pot
* A few papers or documents scattered across the desk

It's worth noting that the image is likely a humorous representation of a llama working at a desk, rather than an actual depiction of a real-world scene.
```
Pretty good.

And if you ever get bored interacting with the model using cli, we can change that by installing [Open WebUI](https://github.com/open-webui/open-webui). 

## Installing and running Open WebUI

Open WebUI is an extensible, feature-rich, and user-friendly self-hosted WebUI designed to operate entirely offline. It supports various LLM runners, including Ollama. For more information, be sure to check out the Open WebUI [documentation](https://docs.openwebui.com).

Open WebUI can be installed using pip. Just make sure you're using **Python 3.11**. 

```bash
$ python3.11 -m venv webui
$ source webui/bin/activate
$ pip install open-webui
$ open-webui serve
```

Once Open WebUI has been installed, you can access it in your browser at: http://localhost:8080. Just create a new account to get in. Looks a lot like other services, doesn't it?

![Open WebUI user experience is similar to other online services](/images/open-webui.png)

## Some Ollama hints

You can use ```ollama list``` to list pulled models, ```ollama ps``` to list running models, ```ollama stop``` to stop a running model,  ```ollama show``` to get information about a model, and ```ollama rm <model>``` to remove a model. 

To interact with the ollama service, you can use systemctl.

```bash
sudo systemctl start ollama
sudo systemctl status ollama
sudo systemctl stop ollama
```

## Few final words (from gemma2:2b)

So, whether you're diving into cutting-edge research or simply seeking more control over your AI applications, running LLMs locally with Ollama empowers you with flexibility and privacy. By embracing this open-source technology, you not only unlock a world of possibilities but also contribute to the growing democratization of AI.  The journey from curiosity to creative exploration begins now – start experimenting and shaping the future of language technology in your own hands!

I hope you learned something new from this blog post, and in case you want to contact me, feel free to reach me through [LinkedIn](https://linkedin.com/in/tommimarjomaa) or [Twitter](https://twitter.com/tommimarjomaa).

Until next time, take care.


