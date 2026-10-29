import "./garden.css";

// Original 16-pixel crop sprites, drawn without external image assets.
function Crop({ kind }: { kind: number }) {
  const colors = ["#e99b3b", "#da5652", "#efc75c", "#739e4d", "#d95b75"];
  return (
    <g shapeRendering="crispEdges">
      <path
        d="M7 2h2v6H7zM3 1h3v2h2v3H5V4H3zM10 0h4v3h-2v2H9V2h1z"
        fill="#345f35"
      />
      {kind === 0 ? (
        <>
          <path d="M4 7h8v5h-2v3H8v2H6v-4H4z" fill={colors[0]} />
          <path d="M5 9h4v1H5zM7 12h3v1H7z" fill="#b96c30" />
        </>
      ) : kind === 2 ? (
        <>
          <path d="M5 5h6v10H5z" fill={colors[2]} />
          <path d="M3 9h2v3h2v5H5v-2H3zM11 9h2v6h-2v2H9v-5h2z" fill="#467543" />
          <path
            d="M6 6h1v2H6zM9 6h1v2H9zM6 10h1v2H6zM9 10h1v2H9z"
            fill="#fff0a1"
          />
        </>
      ) : (
        <>
          <path d="M4 6h8v2h2v6h-2v2H4v-2H2V8h2z" fill={colors[kind]} />
          <path
            d="M4 8h3v2H4zM3 10h2v2H3z"
            fill={kind === 3 ? "#afc873" : "#f5b291"}
          />
          {kind === 4 && (
            <path
              d="M8 10h1v1H8zM11 9h1v1h-1zM6 13h1v1H6zM10 13h1v1h-1z"
              fill="#fff0bb"
            />
          )}
          {kind === 3 && (
            <path d="M7 7h2v2H7zM10 9h2v2h-2zM5 12h5v2H5z" fill="#416f3c" />
          )}
        </>
      )}
    </g>
  );
}
export default function Garden({
  total,
  grown,
}: {
  total: number;
  grown: number;
}) {
  const count = Math.max(1, Math.min(total, 24));
  const mature =
    total > 0
      ? Math.floor((Math.max(0, Math.min(grown, total)) / total) * count)
      : 0;
  const cols = count <= 6 ? 3 : 6;
  const rows = Math.ceil(count / cols);
  const tileWidth = cols === 3 ? 88 : 64;
  const tileHeight = Math.min(54, 164 / rows);
  const gap = 8;
  const width = cols * tileWidth + (cols - 1) * gap;
  const startX = (640 - width) / 2;
  const startY = 148 + (164 - (rows * tileHeight + (rows - 1) * gap)) / 2;
  return (
    <div className="garden-scene" aria-hidden="true">
      <svg
        viewBox="0 0 640 370"
        preserveAspectRatio="xMidYMid slice"
        shapeRendering="crispEdges"
      >
        <rect width="640" height="370" fill="#c7e8ea" />
        <path
          d="M0 82h56V64h55V52h54v13h38v22h58v-8h55V56h63V43h53v15h49v20h71V59h50v23h38v72H0z"
          fill="#a2c4a0"
        />
        <path
          d="M0 108h42V95h72v12h58v-6h58v-9h57v16h64V87h52v13h79v-9h62v19h96v58H0z"
          fill="#7ca779"
        />
        <rect y="128" width="640" height="242" fill="#99b96e" />
        <path
          d="M0 151h85v6h109v-5h110v9h138v-9h198v9H0zM0 308h102v8h175v-5h150v8h213v6H0z"
          fill="#a7c77c"
        />
        <g fill="#fffdf1">
          <path d="M67 32h16v-8h32v8h16v8h16v12H51V40h16z" />
          <path d="M381 28h14v-7h25v7h22v10h12v10h-88V38h15z" />
          <path d="M228 61h18v-8h24v8h18v13h-75v-8h15z" />
        </g>
        <g fill="#efca68">
          <path d="M550 22h24v7h8v24h-8v7h-24v-7h-8V29h8z" />
          <path d="M559 10h6v7h-6zM559 65h6v7h-6zM529 38h8v6h-8zM587 38h8v6h-8z" />
        </g>
        <path d="M550 30h23v5h-23z" fill="#ffe4a0" />
        <g fill="#e9d7ad">
          <rect x="34" y="125" width="572" height="7" />
          <rect x="34" y="139" width="572" height="5" />
          {Array.from({ length: 18 }, (_, i) => (
            <g key={i}>
              <path d={`M${37 + i * 33} 120h4v-5h5v5h4v31h-13z`} />
              <rect
                x={46 + i * 33}
                y={122}
                width="4"
                height="29"
                fill="#c3ad7d"
              />
            </g>
          ))}
        </g>
        <path d="M0 343h640v27H0z" fill="#d6bf8e" />
        <path d="M0 343h640v5H0z" fill="#c2aa76" />
        <g fill="#b9a174">
          {Array.from({ length: 20 }, (_, i) => (
            <rect
              key={i}
              x={i * 34 + 5}
              y={i % 2 ? 354 : 363}
              width="9"
              height="3"
            />
          ))}
        </g>
        <g>
          {Array.from({ length: count }, (_, i) => {
            const x = startX + (i % cols) * (tileWidth + gap);
            const y = startY + Math.floor(i / cols) * (tileHeight + gap);
            return (
              <g key={i} className={i < mature ? "garden-grown" : ""}>
                <rect
                  x={x + 3}
                  y={y + 4}
                  width={tileWidth}
                  height={tileHeight}
                  fill="#789859"
                />
                <rect
                  x={x}
                  y={y}
                  width={tileWidth}
                  height={tileHeight}
                  fill="#75513d"
                />
                <rect
                  x={x + 3}
                  y={y + 3}
                  width={tileWidth - 6}
                  height={tileHeight - 6}
                  fill="#976949"
                />
                <path
                  d={`M${x + 6} ${y + 10}h${tileWidth - 12}v3H${x + 6}zM${x + 6} ${y + tileHeight - 10}h${tileWidth - 12}v3H${x + 6}z`}
                  fill="#82573f"
                />
                {i < mature ? (
                  <g
                    transform={`translate(${x + tileWidth / 2 - 16},${y + tileHeight / 2 - 17}) scale(2)`}
                  >
                    <Crop kind={i % 5} />
                  </g>
                ) : (
                  <g
                    transform={`translate(${x + tileWidth / 2 - 8},${y + tileHeight / 2 - 8})`}
                  >
                    <path
                      d="M7 7h3v10H7zM0 2h5v3h3v5H3V7H0zM11 3h5v5h-3v3H9V6h2z"
                      fill="#5c893f"
                    />
                    <path d="M1 3h3v3H1zM12 4h3v2h-3z" fill="#b4cf79" />
                  </g>
                )}
              </g>
            );
          })}
        </g>
        <g>
          {[28, 52, 592, 614].map((x, i) => (
            <g key={x} transform={`translate(${x},${205 + (i % 2) * 70})`}>
              <rect x="3" y="7" width="3" height="18" fill="#507c42" />
              <path
                d="M0 2h3v-3h5v3h3v5H8v3H3V7H0z"
                fill={i % 2 ? "#f4db84" : "#f2d5c7"}
              />
              <rect x="3" y="3" width="4" height="4" fill="#d69c4b" />
            </g>
          ))}
        </g>
        <g transform="translate(535,284)">
          <rect x="20" y="8" width="6" height="47" fill="#967449" />
          <rect width="50" height="25" fill="#71513a" />
          <rect x="3" y="3" width="44" height="19" fill="#d7b77f" />
          <path
            d="M21 10h4v11h-4zM13 5h6v3h4v6h-6v-3h-4zM28 6h7v6h-5v4h-5v-6h3z"
            fill="#4c7440"
          />
        </g>
      </svg>
    </div>
  );
}
