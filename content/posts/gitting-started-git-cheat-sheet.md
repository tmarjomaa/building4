---
author: "Tommi Marjomaa"
title: "Gitting started - Git Cheat Sheet"
linktitle: "Gitting started - Git Cheat Sheet"
date: "2020-07-05T18:00:00+03:00"
tags: ["git", "cheatsheet"]
draft: false
---
I know there are already bunch of Git cheat sheets all around The Internets, but this one is something I have gathered and kept close to me while getting started with git on my (continuing) journey from an ops guy to a devops guy. And if you happened to bump into this page after searching for "git cheat sheet", I believe you'll find relevant information for you.

If you aren't familiar with [Git](https://git-scm.com/), it is a free and open source distributed version control system, and it's designed to handle projects no matter the size. From small projects to very large projects. 

If you're even slightly concerned about your precious scripts, tools and source codes, you will need to use a source control. By now, most people (both dev and ops) have already acknowledged this, as there a loads of benefits using a source control, like file history, recovery of deleted files, parallel working copies and CI/CD possibilities. And git is all you need to claim those benefits. And remember this:
> If it's not in a source control, it does not exist.

Enough with the chit chat, let's get on with the cheat sheet. I hope it will save  your time when you just can't remember one of the commands. 

## User config

First thing you should do after installing Git is to set your user name and email address. Make sure you use --global flag, so that you only need to do this once.

Define author name to be attached to your commits

```bash 
$ git config --global user.name "[firstname lastname]"
```

Define author email address to be attached to your commits

```bash 
$ git config --global user.email "[valid email address]"
```

Check your settings

```bash
git config --list
```

## Basics

The following commands will really get you on track with Git basics. These help you  in configuring and initializing a repository, tracking files, staging and commiting changes. 

Initialize existing directory as a Git repository

```bash 
$ git init
```

Clone an existing repository located at "[repository-url]" to the local machine

```bash 
$ git clone "[repository-url]"
```

Stage modified files or folders into next commit. You can use . to stage all current changes

```bash
$ git add "[file-name|folder-name|.]"
```

Commit the staged snapshot into version history with "[descriptive message]" as the commit message

```bash
$ git commit -m "[descriptive message]"
```

List commits in a repository. Use it to find out who did what and when

```bash
$ git log
```

Determine state (staged, unstaged or untracked) of files

```bash
$ git status
```

Determine which files are changed, but not yet staged

```bash
$ git diff
```

## Remote Repositories

You need to know how to manage your remote repositories. Why? Because it enables collaboration with others. This involves managing remote repositories and pushing and pulling data to and from the repositories when sharing work. 

List all remotes that are currently configured. Use -v flag to show the URLs 

```bash
$ git remote
```

Add new remote repository with a name "[remote-alias]" from "[remote-url]". After adding the remote repository, you can use the alias (for example _origin_) as a shortcut for the remote.

```bash
$ git remote add "[remote-alias]" "[remote-url]"
```

Fetch a specific branch from the remote repository. Leave out the "[branch-name]" to fetch all branches. 

```bash
$ git fetch "[remote-alias]" "[branch-name]"
```

After getting your awesome code changes ready, it's time to push the code to the remote repository branch

```bash
$ git push "[remote-alias]" "[branch-name]"
```

## Branches & Merge

Before continuing the cheat sheet with git branch commands, I'll briefly touch on a topic **What is a Git branch?**

Git branches let you work with multiple versions of your files by isolating work in progress code from the completed work in master branch. After making code modifications and _testing the changes_ in a development branch, you will _merge_ the development branch into master branch.

List all branches in your repository

```bash
$ git branch
```

Create a new branch with name "[new-branch-name]"

```bash
$ git branch "[new-branch-name]"
```

Create and check out (switch to) a new branch with name "[new-branch-name]". Checkout existing branch by leaving out the -b flag. You can also remove a branch by using -d flag

```bash
$ git checkout -b "[new-branch-name]"
```

Merge specified branch into the currently active branch. You need to be on the branch that you are _merging into_. Say you want to merge development branch into master. Make sure you first _git checkout master_ and then run

```bash
$ git merge "[development-branch-name]"
```

### Forewords

Of course Git has more commands, but those are the ones I use the most. The last command I want to introduce is how you can get manpage help for Git commands. 

```bash 
$ git help "[command]"
```

Before ending the post, I'd like to add few practises I've found useful. I'm 100% sure that you can find these from all version control best practices list, but that's just how it is :grin:. Follow these and you'll be fine.

1. Use branches for development and bugfixing.
2. One commit for one "thing", be it a feature or a bugfix.
3. Commit often to keep commits small and enable frequent code sharing.
4. Only commit completed, fully tested and working code.
5. Write proper commit messages

Did I miss some command(s) you'd like me to add? Feel free to ping me trough [LinkedIn](https://linkedin.com/in/tommimarjomaa) or [Twitter](https://twitter.com/tommimarjomaa) and let's add them.
