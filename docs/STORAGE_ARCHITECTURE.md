# Signal IndexedDB project storage

Signal stores project metadata in `localStorage` for quick indexing and active-project recovery, and stores media blobs in a versioned IndexedDB database named `signal_asset_store`.

## Schema versions

- `projectVersion: 3` — projects reference media by asset ID and keep metadata, selected option, redacted diagnostics, prompt version, timestamps, and export settings.
- `assetVersion: 1` — assets contain a Blob, MIME type, width, height, optional checksum, source filename, role, size, creation time, and owning project link.
- `packageVersion: 1` — local backup packages contain project JSON plus media blob entries.

## IndexedDB design

`signal-asset-store.js` owns all blob persistence and never manipulates UI. It creates:

- `assets` keyed by `assetId`.
- `projectAssets` keyed by `projectId:assetId`, with indexes by `projectId` and `assetId`.

Project records can reference `originalAssetId`, `previewAssetId`, and `editedAssetId`; nested media objects also keep their `assetId` for local hydration. Runtime previews are rehydrated from blobs after refresh, tab close, browser restart, or crash recovery.

## Migration strategy

`signal-migrations.js` imports legacy `data:image/...` data URLs into IndexedDB one asset at a time. Only after a blob is saved successfully does the project receive its asset reference and move the legacy value to a `*DataUrl` backup field. This keeps migration idempotent: already migrated assets are skipped, partially migrated projects continue from the remaining data URLs, and invalid data URLs fail without overwriting project metadata.

## Quota and unavailable storage

The asset store detects IndexedDB unavailability, quota errors, and permission/storage failures, then raises friendly messages. `signal-storage.js` saves project metadata only after media import succeeds, so failed writes do not corrupt or half-rewrite project JSON.

## Cleanup

Deleting a project removes only assets linked to that project. `cleanupOrphans(projects)` compares all known project references with IndexedDB assets and removes blobs that no remaining project references.

## Backup / restore format

`exportProjectPackage(projectId)` returns an object:

```json
{
  "packageVersion": 1,
  "projectVersion": 3,
  "assetVersion": 1,
  "exportedAt": "ISO-8601 timestamp",
  "project": { "projectId": "...", "originalAssetId": "..." },
  "media": [
    { "assetId": "...", "role": "original", "mimeType": "image/jpeg", "width": 1080, "height": 1350, "blob": "Blob" }
  ]
}
```

API keys, authorization headers, source image request payloads, and other secret-like diagnostic fields are stripped from backup diagnostics. Restore validates the package, writes blobs locally, normalizes older project JSON to the current schema, and saves the restored project metadata.

## Child variant persistence
More Like This child options are stored inside the project optimization result next to their parent, with lineage metadata identifying `parentOptionId`, `rootOptionId`, and `generationType: more-like-this`. The per-option state map stores each child independently, so local preview assets, imported edit assets, verification results, preservation checklists, operation review status, and export settings are not shared with the parent.

Existing save, reload, backup, restore, migration, duplication, deletion, and IndexedDB hydration workflows treat children as normal options. Removing a child deletes only its own option state and referenced assets. Removing a parent with children is blocked unless the caller explicitly confirms cascade deletion, preventing silent orphaned children.
