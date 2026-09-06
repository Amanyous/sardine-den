export const GLASS_FILTER_ID = 'sardine-liquid-glass';

// A single shared displacement filter. SVG filters are expensive to mount, so
// every glass surface references this one filter. feDisplacementMap bends the
// blurred backdrop in real time; keeping the chain to one displace + a soft
// blur preserves the source alpha so the glass stays translucent instead of
// turning grey. The RGB separation experiment never survived that well, so the
// chromatic fringe is intentionally left out here.

export default function GlassDefs() {
  return (
    <svg aria-hidden="true" width="0" height="0" className="liquid-glass-defs">
      <defs>
        <filter
          id={GLASS_FILTER_ID}
          colorInterpolationFilters="sRGB"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.008 0.013"
            numOctaves="2"
            seed="17"
            result="noise"
          />
          <feGaussianBlur in="noise" stdDeviation="1.1" result="map" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="map"
            scale="30"
            xChannelSelector="R"
            yChannelSelector="G"
            result="displaced"
          />
          <feGaussianBlur in="displaced" stdDeviation="0.2" result="sharp" />
        </filter>
      </defs>
    </svg>
  );
}
