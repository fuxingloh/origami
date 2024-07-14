# Imagiro Service

The API-service for Origami.

## Object Ownership (Tenancy & IAM)

Without the `SERVICE_IAM_ENDPOINT` env configured, `imagiro-service` will run in single-tenancy.
Resolving all objects ownership `owner: string` to `owner: '0'`.

Configuring `SERVICE_IAM_ENDPOINT` will enable multi-tenancy by enshrining object ownership resolution
responsibility to an IAM service.
The management plane will authorize requests coming in centrally as well as
resolving `authorization` token to `owner: string`.
