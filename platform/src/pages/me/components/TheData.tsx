import { forwardRef, useImperativeHandle, useState, useCallback, useEffect, memo } from 'react';
import * as UserApiService from '@/api/system/user';
import { showGlobalNotification } from '@/components/Notification';
import { useTranslation } from '@/hooks/useTranslation';
import type { GetUserRes, UpdateUserReq } from '@/api/system/type';
import type { Props } from '../index';

// 暴露给父组件的方法
export interface TheDataRef {
  /** 刷新用户数据 */
  refresh: () => void;
  /** 获取当前用户 */
  getUser: () => GetUserRes | null;
  /** 打开编辑对话框 */
  openEditDialog: () => void;
}

const TheData = memo(
  forwardRef<TheDataRef, Props>(({ localObj }, ref) => {
    const { profileRef, detailsRef, dialogRef } = localObj;
    const t = useTranslation();
    const [currentUser, setCurrentUser] = useState<GetUserRes | null>(null);

    // 获取当前用户信息
    const fetchCurrentUser = useCallback(async () => {
      try {
        // 先从本地存储获取用户基本信息
        const localUser = localStorage.getItem('userInfo');
        if (localUser) {
          const parsedUser = JSON.parse(localUser);
          // 然后从服务器获取最新的用户信息
          const response = await UserApiService.getFn({ data: { id: parsedUser.id } });
          if (response.data) {
            const userData = response.data.data;
            setCurrentUser(userData);

            // 通知各个组件更新数据
            profileRef.current?.updateUser(userData);
            detailsRef.current?.updateUser(userData);
          }
        }
      } catch (error) {
        console.warn(error);
      }
    }, [profileRef, detailsRef, t]);

    // 保存用户信息
    const handleSave = useCallback(
      async (formData: UpdateUserReq) => {
        if (!currentUser?.id) return;

        try {
          const updateData: UpdateUserReq = {
            id: currentUser.id,
            username: formData?.username,
            departmentObj: formData?.departmentObj,
            roleArr: formData?.roleArr,
            isEnabled: formData?.isEnabled || false,
          };

          await UserApiService.updateFn({ data: updateData });
          showGlobalNotification({
            type: 'success',
            message: t('common.interact.operationSuccess'),
          });
          dialogRef.current?.close();
          await fetchCurrentUser();
        } catch (error) {
          console.warn(error);
        }
      },
      [currentUser, fetchCurrentUser, dialogRef, t],
    );

    // 打开编辑对话框
    const openEditDialog = useCallback(() => {
      if (currentUser) {
        dialogRef.current?.open(currentUser);
      }
    }, [currentUser, dialogRef]);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        refresh: fetchCurrentUser,
        getUser: () => currentUser,
        openEditDialog,
      }),
      [fetchCurrentUser, currentUser, openEditDialog],
    );

    // 初始化加载
    useEffect(() => {
      fetchCurrentUser();
    }, [fetchCurrentUser]);

    // 设置对话框的保存回调
    useEffect(() => {
      if (dialogRef.current) {
        dialogRef.current.setSaveHandler(handleSave);
      }
    }, [dialogRef, handleSave]);

    return null; // 这是一个无渲染组件
  }),
);

TheData.displayName = 'TheData';

export default TheData;
