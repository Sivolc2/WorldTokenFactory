import { useState, useEffect } from 'react';
import type { Artifact } from '../types';
import { getMediaUrl, fetchYoutubeMeta } from '../api';
import { youtubeVideoId, youtubeThumbnail } from '../utils/formatting';

interface ArtifactListProps {
  artifacts: Artifact[];
}

function DocumentArtifact({ artifact }: { artifact: Artifact }) {
  const src = getMediaUrl(artifact.domain, artifact.filename);
  return (
    <div className="artifact-item">
      <div className="artifact-item__main">
        <span className="artifact-item__icon">📄</span>
        <div className="artifact-item__info">
          <div className="artifact-item__filename">{artifact.filename}</div>
          <div className="artifact-item__domain">/{artifact.domain}/</div>
          {artifact.relevance && (
            <div className="artifact-item__relevance">{artifact.relevance}</div>
          )}
        </div>
        <a className="artifact-item__toggle" href={src} target="_blank" rel="noopener noreferrer">
          Open ↗
        </a>
      </div>
    </div>
  );
}

function ImageArtifact({ artifact }: { artifact: Artifact }) {
  const [expanded, setExpanded] = useState(false);
  const src = getMediaUrl(artifact.domain, artifact.filename);

  return (
    <div className="artifact-item">
      <div className="artifact-item__main">
        <span className="artifact-item__icon">🗺️</span>
        <div className="artifact-item__info">
          <div className="artifact-item__filename">{artifact.filename}</div>
          <div className="artifact-item__domain">/{artifact.domain}/</div>
          {artifact.relevance && (
            <div className="artifact-item__relevance">{artifact.relevance}</div>
          )}
        </div>
        <button className="artifact-item__toggle" onClick={() => setExpanded((v) => !v)}>
          {expanded ? '▲ Hide' : '▾ Preview'}
        </button>
      </div>
      {expanded && (
        <div className="artifact-item__preview">
          <a href={src} target="_blank" rel="noopener noreferrer">
            <img src={src} alt={artifact.filename} loading="lazy" style={{ cursor: 'zoom-in' }} />
          </a>
          <div style={{ marginTop: 4, textAlign: 'right' }}>
            <a href={src} target="_blank" rel="noopener noreferrer" className="artifact-item__toggle">
              Open full size ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function YouTubeArtifact({ artifact }: { artifact: Artifact }) {
  const url = artifact.url ?? '';
  const videoId = youtubeVideoId(url);
  const [title, setTitle] = useState<string | null>(null);
  const [embedded, setEmbedded] = useState(false);
  const thumbnailUrl = videoId ? youtubeThumbnail(videoId) : null;
  const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : null;

  useEffect(() => {
    if (!url) return;
    fetchYoutubeMeta(url)
      .then((meta) => setTitle(meta.title))
      .catch(() => setTitle(null));
  }, [url]);

  return (
    <div className="artifact-item">
      <div className="artifact-yt">
        {!embedded ? (
          <button
            className="artifact-yt__thumb-btn"
            onClick={() => embedUrl && setEmbedded(true)}
            title="Play video"
            style={{ display: 'block', flexShrink: 0, border: 'none', padding: 0, background: 'none', cursor: 'pointer', position: 'relative' }}
          >
            {thumbnailUrl ? (
              <img className="artifact-yt__thumb" src={thumbnailUrl} alt="YouTube thumbnail" />
            ) : (
              <div className="artifact-yt__thumb" />
            )}
            <span style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: 28, lineHeight: 1, pointerEvents: 'none',
            }}>▶</span>
          </button>
        ) : null}
        <div className="artifact-yt__info">
          <span className="artifact-item__icon" style={{ fontSize: 16 }}>🎥</span>
          <div className="artifact-yt__title">
            {title ?? artifact.filename.replace('.url', '')}
          </div>
          {artifact.relevance && (
            <div className="artifact-item__relevance" style={{ marginTop: 4 }}>
              {artifact.relevance}
            </div>
          )}
          {!embedded && url && (
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              {embedUrl && (
                <button className="artifact-item__toggle" onClick={() => setEmbedded(true)}>
                  ▶ Embed
                </button>
              )}
              <a className="artifact-item__toggle" href={url} target="_blank" rel="noopener noreferrer">
                YouTube ↗
              </a>
            </div>
          )}
          {embedded && (
            <button className="artifact-item__toggle" style={{ marginTop: 6 }} onClick={() => setEmbedded(false)}>
              ▲ Hide
            </button>
          )}
        </div>
      </div>
      {embedded && embedUrl && (
        <div className="artifact-item__preview" style={{ marginTop: 8 }}>
          <iframe
            src={embedUrl}
            title={title ?? artifact.filename}
            style={{ width: '100%', aspectRatio: '16/9', border: 'none', borderRadius: 4 }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
}

function VideoArtifact({ artifact }: { artifact: Artifact }) {
  const [expanded, setExpanded] = useState(false);
  const src = getMediaUrl(artifact.domain, artifact.filename);
  const label = artifact.filename.split('/').pop() ?? artifact.filename;

  return (
    <div className="artifact-item">
      <div className="artifact-item__main">
        <span className="artifact-item__icon">🎬</span>
        <div className="artifact-item__info">
          <div className="artifact-item__filename">{label}</div>
          <div className="artifact-item__domain">/{artifact.domain}/</div>
          {artifact.relevance && (
            <div className="artifact-item__relevance">{artifact.relevance}</div>
          )}
        </div>
        <button className="artifact-item__toggle" onClick={() => setExpanded((v) => !v)}>
          {expanded ? '▲ Hide' : '▶ Play'}
        </button>
      </div>
      {expanded && (
        <div className="artifact-item__preview">
          <video controls src={src} style={{ width: '100%', borderRadius: 4 }} preload="metadata" />
        </div>
      )}
    </div>
  );
}

function AudioArtifact({ artifact }: { artifact: Artifact }) {
  const src = getMediaUrl(artifact.domain, artifact.filename);

  return (
    <div className="artifact-item">
      <div className="artifact-audio">
        <div className="artifact-audio__filename">
          🎵 {artifact.filename}
          {artifact.relevance && (
            <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: 8 }}>
              — {artifact.relevance}
            </span>
          )}
        </div>
        <audio controls src={src} preload="none" />
      </div>
    </div>
  );
}

function DataArtifact({ artifact }: { artifact: Artifact }) {
  const src = getMediaUrl(artifact.domain, artifact.filename);
  return (
    <div className="artifact-item">
      <div className="artifact-item__main">
        <span className="artifact-item__icon">📊</span>
        <div className="artifact-item__info">
          <div className="artifact-item__filename">{artifact.filename}</div>
          <div className="artifact-item__domain">/{artifact.domain}/</div>
          {artifact.relevance && (
            <div className="artifact-item__relevance">{artifact.relevance}</div>
          )}
        </div>
        <a className="artifact-item__toggle" href={src} download={artifact.filename} rel="noopener noreferrer">
          Download ↓
        </a>
      </div>
    </div>
  );
}

export default function ArtifactList({ artifacts }: ArtifactListProps) {
  if (artifacts.length === 0) return null;

  return (
    <div>
      <div className="rf-section__title">Artifacts ({artifacts.length} found)</div>
      <div className="artifact-list">
        {artifacts.map((artifact, i) => {
          switch (artifact.type) {
            case 'image':
              return <ImageArtifact key={i} artifact={artifact} />;
            case 'youtube':
              return <YouTubeArtifact key={i} artifact={artifact} />;
            case 'video':
              return <VideoArtifact key={i} artifact={artifact} />;
            case 'audio':
              return <AudioArtifact key={i} artifact={artifact} />;
            case 'data':
              return <DataArtifact key={i} artifact={artifact} />;
            default:
              return <DocumentArtifact key={i} artifact={artifact} />;
          }
        })}
      </div>
    </div>
  );
}
