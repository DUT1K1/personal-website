---
title: "How do authenticators work?"
description: "Detailed mathematical explanation of how MFA works specifically authenticator apps."
author: "Davit Maisuradze"
pubDate: 2026-03-09
updatedDate: 2026-03-09
tags:
  - java
  - security
featured: true
draft: true
---

While working on [Gakvetili](https://gakvetili.ge) it was first time that I encountered production ready code and development. This was challenging for multiple different reasons one of which was the security measures that had to be implemented.
At that point I realised that we needed to have the ability to have 2FA support so that users would feel more protected but more importantly sensitive roles such as customer support and admins should be required to use 2FA as they have access to more data than anyone else.

## Introduction
> This article is about authenticator apps such as Google Authenticator or Microsoft Authenticator, and how they generate time-based login codes.


## What an authenticator app does
## How setup works
## What happens after scanning
## How the code is created
## How the server checks it
## Security details
## Recovery
## Limitations
## Final thoughts