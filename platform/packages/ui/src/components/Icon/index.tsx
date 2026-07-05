import { Icon as IconifyIcon, type IconProps as IconifyIconProps } from '@iconify/react';

export interface IconProps extends Omit<IconifyIconProps, 'icon'> {
  /**
   * 图标名称，支持以下格式：
   * - 格式: "material-symbols:home" 或 "material-symbols:home-outline"
   */
  name: string;
  /**
   * 图标大小，默认为 24
   */
  size?: number | string;
}

/**
 * 公共图标组件，基于 Iconify 离线资源
 * 支持所有 Material Symbols 图标
 *
 * 使用方式：
 * <Icon name="material-symbols:home" />
 * <Icon name="material-symbols:home-outline" size={32} />
 *
 * 图标查询：https://icon-sets.iconify.design/material-symbols/
 */
const Icon: React.FC<IconProps> = ({ name, size = 24, style, ...props }) => {
  //如果icon不存在，返回null
  if (!name) {
    return null;
  }
  return (
    <IconifyIcon
      icon={name}
      style={{
        fontSize: typeof size === 'number' ? `${size}px` : size,
        width: typeof size === 'number' ? `${size}px` : size,
        height: typeof size === 'number' ? `${size}px` : size,
        ...style,
      }}
      {...props}
    />
  );
};

export default Icon;
