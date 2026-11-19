import type { ReactNode } from 'react';
import {
  PlayArrow,
  QuestionMark,
  Visibility,
  Preview,
  History,
  Terminal,
  Settings,
  Apps,
  Pause,
  Info,
  Email,
  Schedule,
  Description,
  Refresh,
  Download,
  Key,
  Science,
  OpenInNew,
  CheckCircle,
  Error as ErrorIcon,
  Sensors,
} from '@mui/icons-material';

const ICON_MAP: Record<string, () => ReactNode> = {
  PlayArrow: () => <PlayArrow />,
  QuestionMark: () => <QuestionMark />,
  Visibility: () => <Visibility />,
  Preview: () => <Preview />,
  History: () => <History />,
  Terminal: () => <Terminal />,
  Settings: () => <Settings />,
  Apps: () => <Apps />,
  Pause: () => <Pause />,
  Info: () => <Info />,
  Email: () => <Email color="primary" />,
  Schedule: () => <Schedule sx={{ mr: 1, verticalAlign: 'middle' }} />,
  Description: () => <Description sx={{ mr: 1, verticalAlign: 'middle' }} />,
  Refresh: () => <Refresh />,
  Download: () => <Download />,
  Key: () => <Key />,
  Science: () => <Science />,
  OpenInNew: () => <OpenInNew />,
  CheckCircle: () => <CheckCircle />,
  Error: () => <ErrorIcon />,
  Sensors: () => <Sensors />,
};

export function renderContractIcon(name?: string): ReactNode {
  if (!name) return <Info />;
  const factory = ICON_MAP[name];
  return factory ? factory() : <Info />;
}
