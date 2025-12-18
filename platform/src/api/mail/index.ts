import type { AxiosConfig } from '../config';
import { axiosPlus } from '../config';

export const sendMail = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/mail/action/send', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    ...axiosConfig,
    url: '/api/v1/mail/action/send',
    method: 'post',
  });
};

export const listMailAccount = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/mail/account/list', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/mail/account/list',
    method: 'post',
    ...axiosConfig,
  });
};

export const getMailAccount = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/mail/account/get', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/mail/account/get',
    method: 'post',
    ...axiosConfig,
  });
};

export const addMailAccount = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/mail/account/add', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/mail/account/add',
    method: 'post',
    ...axiosConfig,
  });
};

export const updateMailAccount = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/mail/account/update', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/mail/account/update',
    method: 'post',
    ...axiosConfig,
  });
};

export const deleteMailAccount = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/mail/account/delete', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/mail/account/delete',
    method: 'post',
    ...axiosConfig,
  });
};

export const verifyMailAccount = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/mail/account/verify', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/mail/account/verify',
    method: 'post',
    ...axiosConfig,
  });
};

export const listMailTemplate = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/mail/template/list', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/mail/template/list',
    method: 'post',
    ...axiosConfig,
  });
};

export const getMailTemplate = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/mail/template/get', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/mail/template/get',
    method: 'post',
    ...axiosConfig,
  });
};

export const addMailTemplate = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/mail/template/add', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/mail/template/add',
    method: 'post',
    ...axiosConfig,
  });
};

export const updateMailTemplate = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/mail/template/update', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/mail/template/update',
    method: 'post',
    ...axiosConfig,
  });
};

export const deleteMailTemplate = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/mail/template/delete', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/mail/template/delete',
    method: 'post',
    ...axiosConfig,
  });
};

export const listMailLog = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/mail/log/list', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/mail/log/list',
    method: 'post',
    ...axiosConfig,
  });
};
