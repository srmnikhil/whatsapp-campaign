import { useRef, useState } from 'react';
import { ErrorAlert } from '../../components/ErrorAlert.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { TEMPLATE_IMAGE_LIMITS } from '../../config/defaults.js';
import { HEADER_FORMATS } from '../../constants/templates.js';
import { useAsyncAction } from '../../hooks/useAsyncAction.js';
import { uploadCampaignImage } from '../../services/mediaApi.js';

/**
 * Handles the optional image upload step.
 * - If the template has no image header: skips straight through (calls onDone(null)).
 * - If there's an image header: shows upload UI. The user can also skip (text-only fallback
 *   is not applicable for campaign sends—they need the media ID—but can proceed without one
 *   only if the header is optional or already uploaded).
 *
 * @param {{ template: object, graphClient: object, settings: object, onDone: (mediaId: string|null) => void }} props
 */
export function ImageUploadStep({ template, graphClient, settings, onDone }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileError, setFileError] = useState(null);

  const hasImageHeader = template.header.format === HEADER_FORMATS.IMAGE;

  const { run, isLoading, error, data: mediaId } = useAsyncAction(async (signal) => {
    if (!file) throw new Error('Select an image first.');
    const id = await uploadCampaignImage(graphClient, settings.phoneNumberId, file, { signal });
    return id;
  });

  function handleFileChange(e) {
    const picked = e.target.files?.[0];
    setFileError(null);
    if (!picked) { setFile(null); setPreviewUrl(null); return; }
    if (!TEMPLATE_IMAGE_LIMITS.mimeTypes.includes(picked.type)) {
      setFileError('Only JPEG and PNG images are supported.');
      return;
    }
    if (picked.size > TEMPLATE_IMAGE_LIMITS.maxBytes) {
      setFileError('Image must be 5 MB or smaller.');
      return;
    }
    setFile(picked);
    setPreviewUrl(URL.createObjectURL(picked));
  }

  // Template has no image header — skip this step
  if (!hasImageHeader) {
    return (
      <Card title="Image header">
        <Alert tone="info">
          This template has no image header. Proceeding without an image.
        </Alert>
        <div className="mt-4">
          <Button onClick={() => onDone(null)}>Continue →</Button>
        </div>
      </Card>
    );
  }

  // Already uploaded — show confirmation
  if (mediaId) {
    return (
      <Card title="Image header">
        <Alert tone="success" title="Image uploaded">
          Media ID: <code className="font-mono text-xs">{mediaId}</code>. This ID will be used for every message in the campaign.
        </Alert>
        <div className="mt-4">
          <Button onClick={() => onDone(mediaId)}>Continue →</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Upload header image"
      description="The image is uploaded once to Meta and reused for every message. JPEG or PNG, max 5 MB."
    >
      <div className="flex flex-col gap-4">
        {/* File picker */}
        <div className="flex flex-col gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png"
            id="header-image-input"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => fileRef.current?.click()}
              disabled={isLoading}
            >
              {file ? 'Change image' : 'Choose image…'}
            </Button>
            {file && <span className="text-sm text-text-secondary">{file.name}</span>}
          </div>
          {fileError && <p className="text-sm text-brand-red">{fileError}</p>}
        </div>

        {/* Preview */}
        {previewUrl && (
          <img
            src={previewUrl}
            alt="Header preview"
            className="max-h-48 max-w-sm rounded-lg object-cover shadow-sm"
          />
        )}

        {error && <ErrorAlert error={error} />}

        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={() => run()}
            disabled={!file || isLoading}
          >
            {isLoading ? 'Uploading…' : 'Upload image'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => onDone(null)}
            disabled={isLoading}
          >
            Skip (send without image)
          </Button>
        </div>
      </div>
    </Card>
  );
}
