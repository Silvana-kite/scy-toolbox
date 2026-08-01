# User Data Deployment

The `users` cloud function owns the `users` CloudBase collection. Mini program
pages must call the function through `miniprogram/services/cloud.js`; they must
not read or write the collection directly.

## Collection and indexes

Create the `users` collection in the CloudBase console before deploying the
function. Create unique ascending indexes for both `openid` and `userId`.
`openid` is an internal field and is never returned to the mini program.

| Field | Type | Purpose |
| --- | --- | --- |
| `openid` | string | Server-side WeChat identity |
| `userId` | string | Public business identifier |
| `nickname` | string | Default or user-selected display name |
| `avatarFileId` | string | Cloud storage file ID for the fixed avatar path |
| `status` | string | Account lifecycle state, initially `active` |
| `schemaVersion` | number | User record schema version, initially `1` |
| `loginCount` | number | Successful application bootstrap count |
| `consentVersion` | string | Version of the accepted image-rights agreement |
| `imageRightsConfirmed` | boolean | User actively confirmed they can process the image |
| `consentedAt`, `consentedAtKey` | Date, string | Server-recorded acceptance time |
| `createdAt`, `updatedAt`, `lastActiveAt` | Date | Queryable timestamps |
| `createdAtKey`, `updatedAtKey`, `lastActiveAtKey` | string | `Asia/Shanghai` timestamps in `YYYY-MM-DD HH:mm:ss` |

Set database permissions so clients have no direct read or write access. Grant
only the deployed cloud function the permissions required to access the
collection.

## Cloud storage

The client stores an avatar at `avatars/<userId>/avatar.png`. It deletes the
previous file before replacing it. Configure storage rules to allow the mini
program to upload this file and to read avatar files for display; the `users`
cloud function validates that the submitted file ID ends in the current user's
fixed avatar path.

## Deploy and verify

1. In WeChat DevTools, install dependencies in `cloudfunctions/users` and deploy
   the `users` cloud function to the selected CloudBase environment.
2. Create the collection and indexes, then apply the database and storage rules.
3. Start the mini program. The first launch first requires the image-rights
   confirmation. Only after the user actively agrees is a record created;
   later launches reuse it and increment `loginCount`.
4. Update the nickname and avatar from the Mine page, then reopen the app or use
   another device signed into the same WeChat account to verify the saved profile.
