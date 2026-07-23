import { css, Global } from '@emotion/core';
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Redirect, Route, Switch, useLocation } from 'react-router-dom';
import Admin from './pages/Admin';
import Dashboard from './pages/Dashboard';
import ImageTranslator from './pages/ImageTranslator';
import { IndexPage } from './pages/Index';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import { NotFoundPage } from './pages/404';
import { AppState } from './store';
import style, { lightThemeVars, darkThemeVars } from './style';
import { routes } from './pages/routes';
import { api } from './apis';
import { setCustomSiteTitle, ThemeMode } from './store/site/slice';
import { toLowerCamelCase } from './utils';

// 公共的页面
const publicPaths = [
  routes.index,
  routes.login,
  routes.signUp,
  routes.resetPassword,
] as readonly string[];

const App: React.FC = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const token = useSelector((state: AppState) => state.user.token);
  const platform = useSelector((state: AppState) => state.site.platform);
  const userIsAdmin = useSelector((state: AppState) => state.user.admin);
  const isMobile = platform === 'mobile';

  const themeMode = useSelector((state: AppState) => state.site.themeMode);

  useEffect(() => {
    api.siteSetting
      .getHomepage({})
      .then((res) =>
        dispatch(
          setCustomSiteTitle(toLowerCamelCase(res.data).customSiteTitle),
        ),
      )
      .catch(() => dispatch(setCustomSiteTitle('')));
  }, [dispatch]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  return (
    <>
      {/* 用于覆盖 antd/antd-mobile 样式 */}
      <Global
        styles={css`
          :root {
            ${Object.entries(lightThemeVars)
              .map(([key, value]) => `--${key}: ${value};`)
              .join('\n')}
          }
          [data-theme='dark'] {
            ${Object.entries(darkThemeVars)
              .map(([key, value]) => `--${key}: ${value};`)
              .join('\n')}
          }
          [data-theme='dark'] {
            color-scheme: dark;
            color: rgba(255, 255, 255, 0.85);
          }
          [data-theme='dark'] body,
          [data-theme='dark'] #root,
          [data-theme='dark'] .Dashboard,
          [data-theme='dark'] .Dashboard__Content,
          [data-theme='dark'] .DashboardBox__Content {
            background-color: #141414;
            color: rgba(255, 255, 255, 0.85);
          }
          [data-theme='dark'] a {
            color: rgba(255, 255, 255, 0.85);
          }
          [data-theme='dark'] a:hover {
            color: var(--primary-color);
          }

          /* 左侧边栏 & 列表区域 */
          [data-theme='dark'] .Dashboard__CollapsibleMenu {
            background-color: #1a1a1c !important;
            border-right-color: #2e2e34 !important;
          }
          [data-theme='dark'] .MyProject__List {
            background-color: #1a1a1c !important;
            border-right-color: #2e2e34 !important;
          }
          [data-theme='dark'] .Dashboard__ListItem .ListItem__Top .ListItem__TopLeft .ListItem__Logo {
            background-color: #26262a !important;
            border-color: #383840 !important;
          }

          /* 项目卡片 */
          [data-theme='dark'] .ProjectItem {
            background-color: #1f1f24 !important;
            border-color: #2e2e34 !important;
            color: rgba(255, 255, 255, 0.85) !important;
          }
          [data-theme='dark'] .ProjectItem__Name {
            color: rgba(255, 255, 255, 0.85) !important;
          }
          [data-theme='dark'] .ProjectItem__Belong {
            color: rgba(255, 255, 255, 0.45) !important;
          }

          /* 进度条 */
          [data-theme='dark'] .TranslationProgress__LineBase,
          [data-theme='dark'] .FileUploadProgress__Progress {
            background: #2e2e38 !important;
          }
          [data-theme='dark'] .TranslationProgress--noSource .TranslationProgress__LineBase {
            background: repeating-linear-gradient(
              45deg,
              #22222a,
              #22222a 15px,
              #2d2d38 0,
              #2d2d38 30px
            ) !important;
          }

          /* Ant Design 组件适配 */
          [data-theme='dark'] .ant-typography,
          [data-theme='dark'] .ant-typography h1,
          [data-theme='dark'] .ant-typography h2,
          [data-theme='dark'] .ant-typography h3,
          [data-theme='dark'] .ant-typography h4 {
            color: rgba(255, 255, 255, 0.85);
          }
          [data-theme='dark'] .ant-card {
            background-color: #1f1f24;
            border-color: #2e2e34;
            color: rgba(255, 255, 255, 0.85);
          }
          [data-theme='dark'] .ant-card-head {
            border-bottom-color: #2e2e34;
            color: rgba(255, 255, 255, 0.85);
          }
          [data-theme='dark'] .ant-list-item {
            border-color: #2e2e34 !important;
            color: rgba(255, 255, 255, 0.85);
          }
          [data-theme='dark'] .ant-list-item-meta-title,
          [data-theme='dark'] .ant-list-item-meta-description {
            color: rgba(255, 255, 255, 0.85);
          }
          [data-theme='dark'] .ant-form-item-label > label,
          [data-theme='dark'] .ant-form-item-control,
          [data-theme='dark'] .ant-form-item {
            color: rgba(255, 255, 255, 0.85);
          }
          [data-theme='dark'] .ant-form-item-required::before {
            color: #ff8f9c;
          }
          [data-theme='dark'] .ant-modal-content,
          [data-theme='dark'] .ant-modal-header {
            background-color: #1f1f24;
            border-color: #2e2e34;
          }
          [data-theme='dark'] .ant-modal-title,
          [data-theme='dark'] .ant-modal-body {
            color: rgba(255, 255, 255, 0.85);
          }
          [data-theme='dark'] .ant-dropdown-menu,
          [data-theme='dark'] .ant-menu,
          [data-theme='dark'] .ant-popover-inner {
            background-color: #1f1f24 !important;
            color: rgba(255, 255, 255, 0.85);
          }
          [data-theme='dark'] .ant-dropdown-menu-item,
          [data-theme='dark'] .ant-menu-item {
            color: rgba(255, 255, 255, 0.85);
          }
          [data-theme='dark'] .ant-dropdown-menu-item:hover,
          [data-theme='dark'] .ant-menu-item-selected {
            background-color: #2a2a30 !important;
          }
          [data-theme='dark'] .ant-popover-arrow {
            border-color: #1f1f24;
          }
          [data-theme='dark'] input,
          [data-theme='dark'] textarea,
          [data-theme='dark'] .ant-input {
            background-color: #1f1f24 !important;
            border-color: #383840 !important;
            color: rgba(255, 255, 255, 0.85) !important;
          }
          [data-theme='dark'] .ant-input-affix-wrapper,
          [data-theme='dark'] .ant-input-group-addon {
            background-color: #1f1f24 !important;
            border-color: #383840 !important;
            color: rgba(255, 255, 255, 0.85) !important;
          }
          [data-theme='dark'] .ant-select-selector,
          [data-theme='dark'] .ant-select-selection {
            background-color: #1f1f24 !important;
            border-color: #383840 !important;
            color: rgba(255, 255, 255, 0.85) !important;
          }
          [data-theme='dark'] .ant-select-dropdown {
            background-color: #1f1f24 !important;
            color: rgba(255, 255, 255, 0.85) !important;
          }
          [data-theme='dark'] .ant-select-item-option-content {
            color: rgba(255, 255, 255, 0.85);
          }
          [data-theme='dark'] .ant-btn {
            background-color: #26262a;
            border-color: #383840;
            color: rgba(255, 255, 255, 0.85);
          }
          [data-theme='dark'] .ant-btn-primary {
            background-color: var(--primary-color);
            border-color: var(--primary-color);
            color: #fff;
          }
          [data-theme='dark'] .ant-radio-button-wrapper {
            background-color: #26262a;
            border-color: #383840;
            color: rgba(255, 255, 255, 0.85);
          }
          [data-theme='dark'] .ant-radio-button-wrapper:not(:first-child)::before {
            background-color: #383840;
          }
          [data-theme='dark'] .ant-radio-button-wrapper:hover,
          [data-theme='dark'] .ant-radio-button-wrapper:focus-within {
            color: var(--primary-color);
          }
          [data-theme='dark'] .ant-radio-button-wrapper-checked {
            background-color: var(--primary-color);
            border-color: var(--primary-color);
            color: #fff;
          }
          [data-theme='dark'] .ant-radio-button-wrapper-checked:not(:first-child)::before {
            background-color: var(--primary-color);
          }
          [data-theme='dark'] .ant-table {
            background-color: #1f1f24;
            color: rgba(255, 255, 255, 0.85);
          }
          [data-theme='dark'] .ant-table-thead > tr > th {
            background-color: #26262a;
            color: rgba(255, 255, 255, 0.85);
            border-bottom-color: #2e2e34;
          }
          [data-theme='dark'] .ant-table-tbody > tr > td {
            border-bottom-color: #2e2e34;
          }
          [data-theme='dark'] .ant-table-tbody > tr.ant-table-row:hover > td {
            background-color: #2a2a30;
          }
          [data-theme='dark'] .ant-tabs-nav,
          [data-theme='dark'] .ant-tabs-tab {
            color: rgba(255, 255, 255, 0.65);
          }
          [data-theme='dark'] .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn {
            color: var(--primary-color);
          }
          [data-theme='dark'] .ant-divider {
            border-color: #2e2e34;
          }
          [data-theme='dark'] .ant-empty-description {
            color: rgba(255, 255, 255, 0.45);
          }
          [data-theme='dark'] .ant-drawer-content {
            background-color: #1f1f24;
          }
          [data-theme='dark'] .ant-drawer-header {
            background-color: #1f1f24;
            border-bottom-color: #2e2e34;
          }
          [data-theme='dark'] .ant-drawer-title,
          [data-theme='dark'] .ant-drawer-close,
          [data-theme='dark'] .ant-modal-close {
            color: rgba(255, 255, 255, 0.85);
          }
          [data-theme='dark'] .ant-drawer-close:hover,
          [data-theme='dark'] .ant-modal-close:hover {
            color: var(--primary-color);
          }

          .ant-badge-dot {
            background-color: ${style.primaryColor};
          }

          .ant-badge-count {
            background-color: ${style.primaryColor};
          }

          /* == 手机版 == */
          ${isMobile &&
          css`
            #root {
              padding-bottom: constant(safe-area-inset-bottom); /* iOS 11.0 */
              padding-bottom: env(safe-area-inset-bottom); /* iOS 11.2 */
            }

            /* 表单 */

            .ant-form {
              .ant-row.ant-form-item {
                .ant-col.ant-form-item-label {
                  padding-bottom: 10px;
                  line-height: 1;

                  label {
                    height: auto;
                  }
                }
              }
            }

            /* 分页 */

            .ant-pagination-prev,
            .ant-pagination-next {
              padding: 0 15px;
            }
          `}
        `}
      />
      {/* 如果没有 token 且访问路径不在公共路径中，则跳转到登陆页面 */}
      {!token && !publicPaths.includes(location.pathname) ? (
        <Redirect to={routes.login} />
      ) : (
        <Switch>
          {/* 去除 URL 结尾的斜杠 */}
          <Route
            path="/:url*(/+)"
            exact
            strict
            render={({ location }) => (
              <Redirect to={location.pathname.replace(/\/+$/, '')} />
            )}
          />
          {/* 去除 URL 中间的重复斜杠 */}
          <Route
            path="/:url(.*//+.*)"
            exact
            strict
            render={({ match }) => (
              <Redirect
                to={`/${(match.params as { url: string }).url.replace(/\/\/+/, '/')}`}
              />
            )}
          />
          <Route exact path={routes.index}>
            <IndexPage />
          </Route>
          <Route path={routes.login}>
            <Login />
          </Route>
          <Route path={routes.signUp}>
            <Register />
          </Route>
          <Route path={routes.resetPassword}>
            <ResetPassword />
          </Route>
          <Route path={routes.imageTranslator.asRouter}>
            <ImageTranslator />
          </Route>
          <Route path={routes.dashboard.$}>
            <Dashboard />
          </Route>
          {userIsAdmin && (
            <Route path={routes.admin}>
              <Admin />
            </Route>
          )}
          <Route path="/*">
            <NotFoundPage />
          </Route>
        </Switch>
      )}
    </>
  );
};

export default App;
