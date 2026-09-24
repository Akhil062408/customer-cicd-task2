# Customer Search Feature

The customer application supports searching customers by name or email.

## Endpoint

GET /customers/search?q=<search-term>

## Examples

Search by name:

/customers/search?q=John

Search by email:

/customers/search?q=john@example.com

## Response

The endpoint returns:

- query
- count
- customers

## Validation

An empty search query returns HTTP 400.

The feature is deployed through the DEV, UAT, and PRODUCTION environments using the Jenkins CI/CD pipeline.