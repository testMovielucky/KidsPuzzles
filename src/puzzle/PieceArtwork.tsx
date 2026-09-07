import { useId } from 'react';
import type { Difficulty, Piece } from './engine';
import { PIECE_EXTENT, PIECE_PADDING, PIECE_UNIT, piecePath } from './geometry';

export function PieceArtwork({
  piece,
  size,
  imageUrl,
  slot = false,
  onBoard = false,
}: {
  piece: Piece;
  size: Difficulty;
  imageUrl: string;
  slot?: boolean;
  onBoard?: boolean;
}) {
  const clipId = `piece-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const path = piecePath(piece.edges);
  return (
    <svg
      className={`piece-art ${slot ? 'piece-slot' : ''}`}
      viewBox={`${-PIECE_PADDING} ${-PIECE_PADDING} ${PIECE_EXTENT} ${PIECE_EXTENT}`}
      style={
        onBoard
          ? {
              position: 'absolute',
              left: `${-PIECE_PADDING}%`,
              top: `${-PIECE_PADDING}%`,
              width: `${PIECE_EXTENT}%`,
              height: `${PIECE_EXTENT}%`,
            }
          : undefined
      }
      aria-hidden="true"
      focusable="false"
    >
      {!slot && (
        <>
          <defs>
            <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
              <path d={path} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clipId})`}>
            <image
              href={imageUrl}
              x={-piece.column * PIECE_UNIT}
              y={-piece.row * PIECE_UNIT}
              width={size * PIECE_UNIT}
              height={size * PIECE_UNIT}
              preserveAspectRatio="none"
            />
          </g>
        </>
      )}
      <path className="piece-outline" d={path} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
