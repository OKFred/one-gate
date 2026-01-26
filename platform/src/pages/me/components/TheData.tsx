import { forwardRef, useImperativeHandle, useState, useCallback, useEffect, memo } from 'react';
import * as UserApiService from '@/api/system/user';
import { showSnackbar } from '@/components/Notification';
import { useTranslation } from '@/hooks/useTranslation';
import type { GetUserRes, UpdateUserReq } from '@/api/system/type';
import type { Props } from '../index';

// 暴露给父组件的方法
export interface TheDataRef {
  /** 获取当前用户 */
  getUser: () => GetUserRes | null;
  /** 打开修改密码对话框 */
  openPasswordDialog: () => void;
  /** 打开修改信息对话框 */
  openEditInfoDialog: () => void;
}

const TheData = memo(
  forwardRef<TheDataRef, Props>(({ localObj }, ref) => {
    const { profileRef, detailsRef, passwordDialogRef, editDialogRef } = localObj;
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
    }, [profileRef, detailsRef]);

    // 保存用户信息
    const handleSave = useCallback(
      async (formData: UpdateUserReq) => {
        if (!currentUser?.id) return;

        try {
          const updateData: UpdateUserReq = {
            id: currentUser.id,
            username: formData?.username,
            regionObj: formData?.regionObj,
            departmentObj: formData?.departmentObj,
            roleArr: formData?.roleArr,
            isEnabled: formData?.isEnabled || false,
          };

          await UserApiService.updateFn({ data: updateData });
          showSnackbar({
            type: 'success',
            message: t('dialog.operationSuccess'),
          });
          passwordDialogRef.current?.close();
          editDialogRef.current?.close();
          await fetchCurrentUser();
        } catch (error) {
          console.warn(error);
        }
      },
      [currentUser, fetchCurrentUser, passwordDialogRef, editDialogRef, t],
    );

    // 打开编辑对话框
    const openPasswordDialog = useCallback(() => {
      if (currentUser) {
        passwordDialogRef.current?.open(currentUser);
      }
    }, [currentUser, passwordDialogRef]);

    // 打开编辑对话框
    const openEditInfoDialog = useCallback(() => {
      if (currentUser) {
        editDialogRef.current?.open(currentUser);
      }
    }, [currentUser, editDialogRef]);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        getUser: () => currentUser,
        openPasswordDialog,
        openEditInfoDialog,
      }),
      [currentUser, openPasswordDialog, openEditInfoDialog],
    );

    // 初始化加载
    useEffect(() => {
      fetchCurrentUser();
    }, [fetchCurrentUser]);

    // 设置对话框的保存回调
    useEffect(() => {
      if (passwordDialogRef.current) {
        passwordDialogRef.current.setSaveHandler(handleSave);
      }
      if (editDialogRef.current) {
        editDialogRef.current.setSaveHandler(handleSave);
      }
    }, [passwordDialogRef, editDialogRef, handleSave]);

    return null; // 这是一个无渲染组件
  }),
);

TheData.displayName = 'TheData';

export default TheData;
