# Configuration

## Local CloudBase environment

Before opening the project in WeChat DevTools, copy
`miniprogram/config/project.local.example.js` to
`miniprogram/config/project.local.js`, then set `envId` to the CloudBase
environment that you will use locally.

`project.local.js` is ignored by Git. The example file is tracked and is safe
to submit.

## Local WeChat DevTools settings

`project.private.config.json` is created and updated by WeChat DevTools for a
developer's local settings. It is intentionally ignored by Git. For a starting
point, copy `project.private.config.example.json` to
`project.private.config.json` and replace `your-wechat-miniprogram-appid` with
an AppID that you are authorized to use.

An AppID is an application identifier, not a secret. Keep the real AppID out
of this template when the repository should not be coupled to one production
mini program.

## What may be committed

The following are normally safe to commit:

- CloudBase environment IDs (`envId`)
- public API base URLs and public feature flags
- application names, regions, and non-secret identifiers
- files named `.env.example` with placeholder values only

An `envId` is selected by the mini program at runtime, so it is not a suitable
place to store a secret. Keeping the real value local is still useful when the
open-source project should not be coupled to one developer's CloudBase
environment.

## What must not be committed

Never commit any of the following, including in `project.local.js`, `.env`, or
source files:

- CloudBase or Tencent Cloud access keys and secret keys
- WeChat AppSecret or other OAuth client secrets
- database passwords, private API tokens, webhook secrets, and signing keys

Configure server-only values as CloudBase cloud-function environment variables
in the CloudBase console. Read them only inside cloud functions; mini program
source code and `project.config.json` are delivered to clients and must be
treated as public.
