'use client';

import { FC } from 'react';

interface HeroLinesProps {
  className?: string;
}

const HeroLines: FC<HeroLinesProps> = ({ className }) => {
  return (
    <svg
      className={className}
      width="1440"
      height="840"
      viewBox="0 0 1440 814"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g filter="url(#filter0_i_0_1)">
        <path
          d="M1319.5 1L1352 1C1356.42 1 1360 4.58172 1360 9V313.297V511.319C1360 515.737 1356.42 519.319 1352 519.319H1242C1237.58 519.319 1234 522.901 1234 527.319V693.932C1234 698.35 1230.42 701.932 1226 701.932H1040M120.5 1H88C83.5817 1 80 4.58172 80 9V511.319C80 515.737 83.5817 519.319 88 519.319H200C204.418 519.319 208 522.901 208 527.319V693.932C208 698.35 211.582 701.932 216 701.932H400M400 701.932H720H1040M400 701.932V805C400 809.418 403.582 813 408 813H1032C1036.42 813 1040 809.418 1040 805V701.932"
          stroke="#E9E9E9"
          strokeWidth="2"
        />
      </g>
      <path
        d="M206.509 519H84.5H4C1.79086 519 0 520.791 0 523V809C0 811.209 1.79086 813 4 813H123.5H396C398.209 813 400 811.209 400 809V706C400 703.791 398.209 702 396 702H214.913C212.707 702 210.918 700.215 210.913 698.009L210.509 522.991C210.504 520.785 208.715 519 206.509 519Z"
        fill="#FAFAFA"
        stroke="#E9E9E9"
        strokeWidth="2"
      />
      <path
        d="M1233.49 519H1355.5H1436C1438.21 519 1440 520.791 1440 523V809C1440 811.209 1438.21 813 1436 813H1316.5H1044C1041.79 813 1040 811.209 1040 809V706C1040 703.791 1041.79 702 1044 702H1225.09C1227.29 702 1229.08 700.215 1229.09 698.009L1229.49 522.991C1229.5 520.785 1231.29 519 1233.49 519Z"
        fill="#FAFAFA"
        stroke="#E9E9E9"
        strokeWidth="2"
      />
      <defs>
        <filter
          id="filter0_i_0_1"
          x="79"
          y="0"
          width="1282"
          height="814"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset />
          <feGaussianBlur stdDeviation="0.5" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.350962 0 0 0 0 0.350962 0 0 0 0 0.350962 0 0 0 0.25 0" />
          <feBlend mode="normal" in2="shape" result="effect1_innerShadow_0_1" />
        </filter>
      </defs>
    </svg>
  );
};

export default HeroLines;
