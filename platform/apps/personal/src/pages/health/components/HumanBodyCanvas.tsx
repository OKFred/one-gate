import React from 'react';
import { Box, Typography, Paper, Chip, Tooltip } from '@mui/material';
import {
  Favorite as HeartIcon,
  Psychology as BrainIcon,
  Air as LungIcon,
  Restaurant as StomachIcon,
  CleanHands as LiverIcon,
  WaterDrop as KidneyIcon,
  Visibility as EyeIcon,
} from '@mui/icons-material';
import { useTranslation } from '@/hooks/useTranslation';

export type OrganType =
  | 'brain'
  | 'heart'
  | 'lungs'
  | 'stomach'
  | 'liver'
  | 'kidneys'
  | 'eyes'
  | null;

interface HumanBodyCanvasProps {
  selectedOrgan: OrganType;
  onSelectOrgan: (organ: OrganType) => void;
}

export const HumanBodyCanvas: React.FC<HumanBodyCanvasProps> = ({
  selectedOrgan,
  onSelectOrgan,
}) => {
  const t = useTranslation();

  // SVG viewBox is 0 0 400 650
  // Dynamic smooth coordinate transformation for zooming
  const getTransform = () => {
    switch (selectedOrgan) {
      case 'brain':
      case 'eyes':
        return 'scale(2.5) translate(0px, 140px)';
      case 'heart':
        return 'scale(2.6) translate(-15px, 30px)';
      case 'lungs':
        return 'scale(2.2) translate(0px, 45px)';
      case 'stomach':
        return 'scale(2.5) translate(-10px, -45px)';
      case 'liver':
        return 'scale(2.5) translate(25px, -35px)';
      case 'kidneys':
        return 'scale(2.4) translate(0px, -90px)';
      default:
        return 'scale(1) translate(0px, 0px)';
    }
  };

  return (
    <Paper
      elevation={4}
      sx={{
        p: 3,
        height: '660px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        background: (theme) =>
          theme.palette.mode === 'dark'
            ? 'radial-gradient(circle at 50% 30%, #0f172a 0%, #020617 100%)'
            : 'radial-gradient(circle at 50% 30%, #f0f9ff 0%, #e0f2fe 100%)',
        border: (theme) => `1px solid ${theme.palette.divider}`,
        borderRadius: 4,
        boxShadow: (theme) =>
          theme.palette.mode === 'dark'
            ? '0 20px 50px rgba(0, 0, 0, 0.6), inset 0 0 2px rgba(56, 189, 248, 0.2)'
            : '0 20px 40px rgba(14, 165, 233, 0.1), inset 0 0 2px rgba(14, 165, 233, 0.3)',
      }}
    >
      {/* Background Cybernetic Tech Grid & Medical Scanning Line */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.12,
          backgroundImage: `linear-gradient(#38bdf8 1px, transparent 1px), linear-gradient(90deg, #38bdf8 1px, transparent 1px)`,
          backgroundSize: '30px 30px',
          pointerEvents: 'none',
        }}
      />

      {/* Header controls & title */}
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 2,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            background: 'linear-gradient(90deg, #38bdf8 0%, #818cf8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: 0.5,
          }}
        >
          {t('personal.health.canvas.title')}
        </Typography>
        <Chip
          label={
            selectedOrgan
              ? t('personal.health.canvas.chipOrganActive').replace(
                  '{{organName}}',
                  getOrganName(selectedOrgan, t),
                )
              : t('personal.health.canvas.chipDefault')
          }
          color={selectedOrgan ? 'primary' : 'default'}
          onDelete={selectedOrgan ? () => onSelectOrgan(null) : undefined}
          sx={{
            fontWeight: 700,
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        />
      </Box>

      {/* SVG Interactive Canvas Container */}
      <Box
        sx={{
          width: '100%',
          height: '510px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        <svg
          viewBox="0 0 400 650"
          style={{
            width: '100%',
            height: '100%',
            maxHeight: '540px',
            transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transform: getTransform(),
            transformOrigin: 'center 35%',
          }}
        >
          <defs>
            {/* Glow Filters */}
            <filter id="cyberGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="organGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Gradients */}
            <linearGradient id="bodySkinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.18" />
              <stop offset="50%" stopColor="#818cf8" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#c084fc" stopOpacity="0.05" />
            </linearGradient>

            <linearGradient id="bodyOutlineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>

            <linearGradient id="arteryGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ff4d4f" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.6" />
            </linearGradient>

            <linearGradient id="veinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.5" />
            </linearGradient>

            <linearGradient id="scanLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Keyframe animations embedded directly in SVG */}
          <style>{`
            /* Medical Laser Scan Line Animation */
            @keyframes scanLaser {
              0% { transform: translateY(30px); opacity: 0.2; }
              50% { transform: translateY(600px); opacity: 0.95; }
              100% { transform: translateY(30px); opacity: 0.2; }
            }

            /* Heart Realistic Double Beat */
            @keyframes heartDoubleBeat {
              0% { transform: scale(1); }
              12% { transform: scale(1.18); }
              24% { transform: scale(1.05); }
              36% { transform: scale(1.22); }
              55% { transform: scale(1); }
              100% { transform: scale(1); }
            }

            /* Expanding Heart Shockwave Ring */
            @keyframes pulseWave {
              0% { r: 12px; opacity: 0.9; stroke-width: 3px; }
              100% { r: 55px; opacity: 0; stroke-width: 0.5px; }
            }

            /* Arterial Blood Flow Animation */
            @keyframes flowArtery {
              0% { stroke-dashoffset: 120; }
              100% { stroke-dashoffset: 0; }
            }

            /* Gastric Wave Motion */
            @keyframes stomachSmoothWave {
              0% { transform: rotate(0deg) scale(1); }
              25% { transform: rotate(2deg) scale(1.04) skewX(2deg); }
              50% { transform: rotate(-1deg) scale(0.98) skewX(-1deg); }
              75% { transform: rotate(1.5deg) scale(1.03) skewX(1deg); }
              100% { transform: rotate(0deg) scale(1); }
            }

            /* Brain Neural Synapse Firing */
            @keyframes neuralFiring {
              0% { filter: drop-shadow(0 0 2px #a855f7); opacity: 0.75; }
              20% { filter: drop-shadow(0 0 14px #d8b4fe); opacity: 1; }
              40% { filter: drop-shadow(0 0 4px #c084fc); opacity: 0.8; }
              60% { filter: drop-shadow(0 0 16px #e9d5ff); opacity: 1; }
              100% { filter: drop-shadow(0 0 2px #a855f7); opacity: 0.75; }
            }

            /* Eye Blink & Iris Pulse */
            @keyframes eyePupilPulse {
              0% { transform: scale(1); opacity: 0.9; }
              50% { transform: scale(1.25); opacity: 1; filter: drop-shadow(0 0 6px #38bdf8); }
              100% { transform: scale(1); opacity: 0.9; }
            }

            /* Lung Rhythmic Respiration */
            @keyframes lungRespiration {
              0% { transform: scale(1) translateY(0); }
              45% { transform: scale(1.1) translateY(-2px); }
              100% { transform: scale(1) translateY(0); }
            }

            .organ-node {
              cursor: pointer;
              transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .organ-node:hover {
              filter: brightness(1.3) drop-shadow(0 0 12px rgba(56, 189, 248, 0.9));
            }
          `}</style>

          {/* Full Anatomical Silhouette (Detailed Head, Eyes, Neck, Torso, Arms, Fingers, Legs, Feet) */}
          <g
            id="fullHumanBodySilhouette"
            onClick={() => onSelectOrgan(null)}
            style={{ cursor: 'pointer' }}
          >
            {/* Main Body Outer Contour */}
            <path
              d="
                M 200 35 
                C 222 35 238 48 238 72 
                C 238 88 230 102 222 108 
                L 225 125 
                L 255 138 
                C 275 147 285 162 290 185 
                L 310 270 
                C 314 290 310 310 302 330 
                L 295 348 
                C 292 355 296 360 300 365 
                C 305 370 308 380 305 385 
                C 301 390 293 392 288 385 
                L 282 375 
                L 272 315 
                L 262 210 
                L 252 290 
                L 246 410 
                C 244 450 248 490 245 530 
                L 242 605 
                C 242 615 252 620 255 622 
                C 258 624 252 630 240 630 
                L 218 630 
                C 214 625 215 605 215 580 
                L 215 440 
                L 200 420 
                L 185 440 
                L 185 580 
                C 185 605 186 625 182 630 
                L 160 630 
                C 148 630 142 624 145 622 
                C 148 620 158 615 158 605 
                L 155 530 
                C 152 490 156 450 154 410 
                L 148 290 
                L 138 315 
                L 128 375 
                L 122 385 
                C 117 392 109 390 105 385 
                C 102 380 105 370 110 365 
                C 114 360 118 355 115 348 
                L 108 330 
                C 100 310 96 290 100 270 
                L 120 185 
                C 125 162 135 147 155 138 
                L 175 125 
                L 178 108 
                C 170 102 162 88 162 72 
                C 162 48 178 35 200 35 Z
              "
              fill="url(#bodySkinGrad)"
              stroke="url(#bodyOutlineGrad)"
              strokeWidth="2"
              strokeDasharray={selectedOrgan ? '3 3' : 'none'}
              style={{ transition: 'all 0.5s ease' }}
            />

            {/* Anatomic Skeleton Joint Highlights */}
            <path
              d="M 175 135 Q 200 142 225 135"
              stroke="#38bdf8"
              strokeWidth="1.5"
              fill="none"
              opacity="0.6"
            />
            <path
              d="M 175 165 C 160 190 160 250 185 270 L 200 275 L 215 270 C 240 250 240 190 225 165"
              stroke="#38bdf8"
              strokeWidth="1"
              strokeDasharray="3 3"
              fill="none"
              opacity="0.3"
            />
            <line
              x1="200"
              y1="125"
              x2="200"
              y2="400"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeDasharray="6 4"
              opacity="0.25"
            />
            <path
              d="M 165 370 Q 200 395 235 370"
              stroke="#38bdf8"
              strokeWidth="1.5"
              fill="none"
              opacity="0.4"
            />
            <ellipse
              cx="168"
              cy="490"
              rx="9"
              ry="12"
              stroke="#38bdf8"
              strokeWidth="1"
              fill="none"
              opacity="0.4"
              strokeDasharray="2 2"
            />
            <ellipse
              cx="232"
              cy="490"
              rx="9"
              ry="12"
              stroke="#38bdf8"
              strokeWidth="1"
              fill="none"
              opacity="0.4"
              strokeDasharray="2 2"
            />
            <path
              d="M 148 625 L 175 625 M 225 625 L 252 625"
              stroke="#38bdf8"
              strokeWidth="1.5"
              opacity="0.5"
            />
          </g>

          {/* Futuristic Scanning Laser Line moving up and down */}
          <g id="scannerLaser" style={{ animation: 'scanLaser 4s ease-in-out infinite' }}>
            <line
              x1="80"
              y1="0"
              x2="320"
              y2="0"
              stroke="url(#scanLineGrad)"
              strokeWidth="3"
              filter="url(#cyberGlow)"
            />
          </g>

          {/* Blood Vessels / Circulatory Arteries & Veins */}
          <g id="circulatorySystem" opacity={selectedOrgan === 'heart' ? 1 : 0.55}>
            <path
              d="
                M 200 185 L 200 70 
                M 200 70 L 188 65 M 200 70 L 212 65
                M 200 185 L 140 230 L 120 340 L 110 375
                M 200 185 L 260 230 L 280 340 L 290 375
                M 200 185 L 200 380 
                M 200 380 L 170 480 L 165 600 
                M 200 380 L 230 480 L 235 600
              "
              stroke="url(#arteryGrad)"
              strokeWidth={selectedOrgan === 'heart' ? '3' : '1.5'}
              fill="none"
              strokeDasharray="6 3"
              style={{
                animation: selectedOrgan === 'heart' ? 'flowArtery 1.2s linear infinite' : 'none',
              }}
            />
            <path
              d="
                M 195 190 L 195 75 
                M 195 190 L 145 235 L 125 345
                M 195 190 L 255 235 L 275 345
                M 195 190 L 195 385 
                M 195 385 L 165 485 L 160 605 
                M 195 385 L 225 485 L 230 605
              "
              stroke="url(#veinGrad)"
              strokeWidth="1.2"
              fill="none"
              opacity="0.6"
            />
          </g>

          {/* ================= ORGAN ANATOMY LAYERS ================= */}

          {/* 1. BRAIN / 大脑 */}
          <g
            className="organ-node"
            onClick={(e) => {
              e.stopPropagation();
              onSelectOrgan('brain');
            }}
            style={{
              animation:
                selectedOrgan === 'brain' ? 'neuralFiring 1.8s ease-in-out infinite' : 'none',
              transformOrigin: '200px 62px',
            }}
            filter={selectedOrgan === 'brain' ? 'url(#cyberGlow)' : undefined}
          >
            <path
              d="M 182 62 C 180 48 192 40 200 40 C 208 40 220 48 218 62 C 218 76 210 82 200 82 C 190 82 182 76 182 62 Z"
              fill={selectedOrgan === 'brain' ? '#a855f7' : '#c084fc'}
              opacity={selectedOrgan === 'brain' ? 0.95 : 0.75}
              stroke="#e9d5ff"
              strokeWidth="1"
            />
            <path
              d="M 188 52 Q 195 58 192 68 M 212 52 Q 205 58 208 68 M 195 44 L 195 78 M 205 44 L 205 78"
              stroke="#ffffff"
              strokeWidth="1"
              fill="none"
              opacity="0.7"
            />
          </g>

          {/* 2. EYES / 眼睛 */}
          <g
            className="organ-node"
            onClick={(e) => {
              e.stopPropagation();
              onSelectOrgan('eyes');
            }}
          >
            <ellipse
              cx="188"
              cy="65"
              rx="5.5"
              ry="3.5"
              fill="#0284c7"
              stroke="#38bdf8"
              strokeWidth="1"
            />
            <circle
              cx="188"
              cy="65"
              r="2"
              fill="#ffffff"
              style={{
                animation: 'eyePupilPulse 2s ease-in-out infinite',
                transformOrigin: '188px 65px',
              }}
            />
            <ellipse
              cx="212"
              cy="65"
              rx="5.5"
              ry="3.5"
              fill="#0284c7"
              stroke="#38bdf8"
              strokeWidth="1"
            />
            <circle
              cx="212"
              cy="65"
              r="2"
              fill="#ffffff"
              style={{
                animation: 'eyePupilPulse 2s ease-in-out infinite',
                transformOrigin: '212px 65px',
              }}
            />
          </g>

          {/* 3. LUNGS / 肺部 */}
          <g
            className="organ-node"
            onClick={(e) => {
              e.stopPropagation();
              onSelectOrgan('lungs');
            }}
            style={{
              animation:
                selectedOrgan === 'lungs' ? 'lungRespiration 3.2s ease-in-out infinite' : 'none',
              transformOrigin: '200px 180px',
            }}
            filter={selectedOrgan === 'lungs' ? 'url(#organGlow)' : undefined}
          >
            <path
              d="M 200 115 L 200 155 M 200 155 L 185 170 M 200 155 L 215 170"
              stroke="#06b6d4"
              strokeWidth="2.5"
              fill="none"
              opacity="0.9"
            />

            <path
              d="M 178 148 C 160 160 152 195 168 220 C 182 215 188 185 188 148 Z"
              fill={selectedOrgan === 'lungs' ? '#06b6d4' : '#22d3ee'}
              opacity={selectedOrgan === 'lungs' ? 0.95 : 0.75}
              stroke="#cffafbe6"
              strokeWidth="1"
            />
            <path
              d="M 222 148 C 240 160 248 195 232 220 C 218 215 212 185 212 148 Z"
              fill={selectedOrgan === 'lungs' ? '#06b6d4' : '#22d3ee'}
              opacity={selectedOrgan === 'lungs' ? 0.95 : 0.75}
              stroke="#cffafbe6"
              strokeWidth="1"
            />
          </g>

          {/* 4. HEART / 心脏 */}
          <g
            className="organ-node"
            onClick={(e) => {
              e.stopPropagation();
              onSelectOrgan('heart');
            }}
            filter={selectedOrgan === 'heart' ? 'url(#cyberGlow)' : undefined}
            style={{
              animation:
                selectedOrgan === 'heart'
                  ? 'heartDoubleBeat 0.95s cubic-bezier(0.2, 0.8, 0.2, 1) infinite'
                  : 'none',
              transformOrigin: '206px 192px',
            }}
          >
            {selectedOrgan === 'heart' && (
              <circle
                cx="206"
                cy="192"
                r="25"
                fill="none"
                stroke="#f43f5e"
                style={{
                  animation: 'pulseWave 1.2s ease-out infinite',
                  transformOrigin: '206px 192px',
                }}
              />
            )}

            <path
              d="M 206 178 C 194 165 180 178 192 196 L 206 212 L 220 196 C 232 178 218 165 206 178 Z"
              fill="#f43f5e"
              stroke="#ffffff"
              strokeWidth="1.8"
            />
            <path
              d="M 200 182 L 204 192 L 212 187 L 214 204"
              stroke="#ffffff"
              strokeWidth="1.2"
              fill="none"
              opacity="0.9"
            />
          </g>

          {/* 5. LIVER / 肝脏 */}
          <g
            className="organ-node"
            onClick={(e) => {
              e.stopPropagation();
              onSelectOrgan('liver');
            }}
            filter={selectedOrgan === 'liver' ? 'url(#organGlow)' : undefined}
            style={{ transformOrigin: '185px 235px' }}
          >
            <path
              d="M 168 220 C 192 214 204 225 204 242 C 188 254 162 242 168 220 Z"
              fill={selectedOrgan === 'liver' ? '#f59e0b' : '#fbbf24'}
              opacity={selectedOrgan === 'liver' ? 0.95 : 0.75}
              stroke="#fef3c7"
              strokeWidth="1"
            />
          </g>

          {/* 6. STOMACH / 胃部 */}
          <g
            className="organ-node"
            onClick={(e) => {
              e.stopPropagation();
              onSelectOrgan('stomach');
            }}
            filter={selectedOrgan === 'stomach' ? 'url(#organGlow)' : undefined}
            style={{
              animation:
                selectedOrgan === 'stomach'
                  ? 'stomachSmoothWave 2.2s ease-in-out infinite'
                  : 'none',
              transformOrigin: '218px 245px',
            }}
          >
            <path
              d="M 206 226 C 228 220 238 238 226 260 C 210 270 198 248 206 226 Z"
              fill={selectedOrgan === 'stomach' ? '#10b981' : '#34d399'}
              stroke="#ffffff"
              strokeWidth="1.5"
              opacity={selectedOrgan === 'stomach' ? 0.95 : 0.8}
            />
          </g>

          {/* 7. KIDNEYS / 肾脏 */}
          <g
            className="organ-node"
            onClick={(e) => {
              e.stopPropagation();
              onSelectOrgan('kidneys');
            }}
            filter={selectedOrgan === 'kidneys' ? 'url(#organGlow)' : undefined}
          >
            <path
              d="M 174 268 C 168 274 168 286 174 292 C 183 289 183 271 174 268 Z"
              fill={selectedOrgan === 'kidneys' ? '#ef4444' : '#f87171'}
              stroke="#ffffff"
              strokeWidth="1"
            />
            <path
              d="M 226 268 C 232 274 232 286 226 292 C 217 289 217 271 226 268 Z"
              fill={selectedOrgan === 'kidneys' ? '#ef4444' : '#f87171'}
              stroke="#ffffff"
              strokeWidth="1"
            />
          </g>
        </svg>
      </Box>

      {/* Quick Select Buttons Bar */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center', zIndex: 2 }}>
        <Tooltip title={t('personal.health.tooltip.brain')}>
          <Chip
            icon={<BrainIcon />}
            label={t('personal.health.organ.brain')}
            onClick={() => onSelectOrgan('brain')}
            color={selectedOrgan === 'brain' ? 'secondary' : 'default'}
            variant={selectedOrgan === 'brain' ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600 }}
          />
        </Tooltip>
        <Tooltip title={t('personal.health.tooltip.eyes')}>
          <Chip
            icon={<EyeIcon />}
            label={t('personal.health.organ.eyes')}
            onClick={() => onSelectOrgan('eyes')}
            color={selectedOrgan === 'eyes' ? 'primary' : 'default'}
            variant={selectedOrgan === 'eyes' ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600 }}
          />
        </Tooltip>
        <Tooltip title={t('personal.health.tooltip.heart')}>
          <Chip
            icon={<HeartIcon />}
            label={t('personal.health.organ.heart')}
            onClick={() => onSelectOrgan('heart')}
            color={selectedOrgan === 'heart' ? 'error' : 'default'}
            variant={selectedOrgan === 'heart' ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600 }}
          />
        </Tooltip>
        <Tooltip title={t('personal.health.tooltip.lungs')}>
          <Chip
            icon={<LungIcon />}
            label={t('personal.health.organ.lungs')}
            onClick={() => onSelectOrgan('lungs')}
            color={selectedOrgan === 'lungs' ? 'info' : 'default'}
            variant={selectedOrgan === 'lungs' ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600 }}
          />
        </Tooltip>
        <Tooltip title={t('personal.health.tooltip.stomach')}>
          <Chip
            icon={<StomachIcon />}
            label={t('personal.health.organ.stomach')}
            onClick={() => onSelectOrgan('stomach')}
            color={selectedOrgan === 'stomach' ? 'success' : 'default'}
            variant={selectedOrgan === 'stomach' ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600 }}
          />
        </Tooltip>
        <Tooltip title={t('personal.health.tooltip.liver')}>
          <Chip
            icon={<LiverIcon />}
            label={t('personal.health.organ.liver')}
            onClick={() => onSelectOrgan('liver')}
            color={selectedOrgan === 'liver' ? 'warning' : 'default'}
            variant={selectedOrgan === 'liver' ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600 }}
          />
        </Tooltip>
        <Tooltip title={t('personal.health.tooltip.kidneys')}>
          <Chip
            icon={<KidneyIcon />}
            label={t('personal.health.organ.kidneys')}
            onClick={() => onSelectOrgan('kidneys')}
            color={selectedOrgan === 'kidneys' ? 'error' : 'default'}
            variant={selectedOrgan === 'kidneys' ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600 }}
          />
        </Tooltip>
      </Box>
    </Paper>
  );
};

function getOrganName(organ: OrganType, t: (key: string) => string): string {
  switch (organ) {
    case 'brain':
      return t('personal.health.organ.brainFull');
    case 'eyes':
      return t('personal.health.organ.eyesFull');
    case 'heart':
      return t('personal.health.organ.heartFull');
    case 'lungs':
      return t('personal.health.organ.lungsFull');
    case 'stomach':
      return t('personal.health.organ.stomachFull');
    case 'liver':
      return t('personal.health.organ.liverFull');
    case 'kidneys':
      return t('personal.health.organ.kidneysFull');
    default:
      return '';
  }
}
