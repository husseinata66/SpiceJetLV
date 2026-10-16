# Real-world API contract validation

These suites check `platform_core/tools/api_contract` against **published, versioned, licensed** API specifications rather than synthetic ones.

```bash
npm test                          # includes realworld.test.js (offline)
npm run test:contracts            # api_contract unit tests + realworld.test.js
npm run test:contracts:matrix     # the classification accuracy matrix, as a Markdown table
npm run test:contracts:external   # large and credential-bearing specs, fetched at pinned refs (network)
```

| File | What it is |
|---|---|
| `fixtures/` | 14 original files from OAI/OpenAPI-Specification, swagger-api/swagger-petstore, postmanlabs/postman-collection and postmanlabs/newman, all Apache-2.0, with their license files |
| `fixtures/SOURCES.json` | Each fixture's source URL, pinned tag or commit, SHA-256, license, and anything excluded and why |
| `classificationMatrix.js` | 54 controlled changes to the real Swagger Petstore spec, each with its expected classification and an independent justification |
| `matrixRunner.js` | Runs the matrix |
| `realworld.test.js` | Checks provenance, parser compatibility, self-comparison, cross-format equivalence, malformed and unsupported inputs, contradictory contracts, a real version change with impact precision, and the matrix |
| `external.js` + `external.sources.json` | GitHub REST (9.9 MB YAML / 13 MB JSON), Stripe (6.6 MB YAML), Kubernetes 1.29/1.30 and three Postman collections. They are not committed: each is fetched, verified by SHA-256, and refused if its fingerprint differs |

## Rules

- **Never edit a fixture.** A changed file is a different fixture: add it with its own source entry. The provenance test fails on any byte change, after CRLF normalization.
- **Commit no credential-shaped content,** even public demo values. Collections that carry it stay in the external suite, which also proves that none of those values survive normalization.
- **Read only.** These suites only read public files and never call an API endpoint.
