import type { AxiosConfig } from '../config';
import axios from '../config';

export const sendMailSingle = (
  axiosConfig: Omit<AxiosConfig<'/api/mail/send/single', 'post'>, 'url' | 'method'>,
) => {
  return axios({
    url: '/api/mail/send/single',
    method: 'post',
    ...axiosConfig,
  });
};

export const listMailAccount = (
  axiosConfig: Omit<AxiosConfig<'/api/mail/account/list', 'post'>, 'url' | 'method'>,
) => {
  return axios({
    url: '/api/mail/account/list',
    method: 'post',
    ...axiosConfig,
  });
};

export const getMailAccount = (
  axiosConfig: Omit<AxiosConfig<'/api/mail/account/get', 'post'>, 'url' | 'method'>,
) => {
  return axios({
    url: '/api/mail/account/get',
    method: 'post',
    ...axiosConfig,
  });
};

export const addMailAccount = (
  axiosConfig: Omit<AxiosConfig<'/api/mail/account/add', 'post'>, 'url' | 'method'>,
) => {
  return axios({
    url: '/api/mail/account/add',
    method: 'post',
    ...axiosConfig,
  });
};

export const updateMailAccount = (
  axiosConfig: Omit<AxiosConfig<'/api/mail/account/update', 'post'>, 'url' | 'method'>,
) => {
  return axios({
    url: '/api/mail/account/update',
    method: 'post',
    ...axiosConfig,
  });
};

export const deleteMailAccount = (
  axiosConfig: Omit<AxiosConfig<'/api/mail/account/delete', 'post'>, 'url' | 'method'>,
) => {
  return axios({
    url: '/api/mail/account/delete',
    method: 'post',
    ...axiosConfig,
  });
};

export const verifyMailAccount = (
  axiosConfig: Omit<AxiosConfig<'/api/mail/account/verify', 'post'>, 'url' | 'method'>,
) => {
  return axios({
    url: '/api/mail/account/verify',
    method: 'post',
    ...axiosConfig,
  });
};

export const listMailTemplate = (
  axiosConfig: Omit<AxiosConfig<'/api/mail/template/list', 'post'>, 'url' | 'method'>,
) => {
  return axios({
    url: '/api/mail/template/list',
    method: 'post',
    ...axiosConfig,
  });
};

export const getMailTemplate = (
  axiosConfig: Omit<AxiosConfig<'/api/mail/template/get', 'post'>, 'url' | 'method'>,
) => {
  return axios({
    url: '/api/mail/template/get',
    method: 'post',
    ...axiosConfig,
  });
};

export const addMailTemplate = (
  axiosConfig: Omit<AxiosConfig<'/api/mail/template/add', 'post'>, 'url' | 'method'>,
) => {
  return axios({
    url: '/api/mail/template/add',
    method: 'post',
    ...axiosConfig,
  });
};

export const updateMailTemplate = (
  axiosConfig: Omit<AxiosConfig<'/api/mail/template/update', 'post'>, 'url' | 'method'>,
) => {
  return axios({
    url: '/api/mail/template/update',
    method: 'post',
    ...axiosConfig,
  });
};

export const deleteMailTemplate = (
  axiosConfig: Omit<AxiosConfig<'/api/mail/template/delete', 'post'>, 'url' | 'method'>,
) => {
  return axios({
    url: '/api/mail/template/delete',
    method: 'post',
    ...axiosConfig,
  });
};

export const listMailLog = (
  axiosConfig: Omit<AxiosConfig<'/api/mail/log/list', 'post'>, 'url' | 'method'>,
) => {
  return axios({
    url: '/api/mail/log/list',
    method: 'post',
    ...axiosConfig,
  });
};
