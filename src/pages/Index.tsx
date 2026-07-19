import { css, Global } from '@emotion/core';
import React, { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { Header } from '../components';
import { Spin } from 'antd';
import brandJump from '../images/brand/mascot-jump1.png';
import { FC } from '../interfaces';
import { useTitle } from '../hooks';
import { api } from '../apis';
import { toLowerCamelCase } from '../utils';

/** 首页的属性接口 */
interface IndexProps {}
/**
 * 首页
 */
export const IndexPage: FC<IndexProps> = () => {
  const { formatMessage } = useIntl(); // i18n
  useTitle({ suffix: formatMessage({ id: 'site.slogan' }) }); // 设置标题
  const [homepageHtml, setHomepageHtml] = useState<string>();
  const [homepageCss, setHomepageCss] = useState<string>();
  const [homepageWelcome, setHomepageWelcome] = useState<string>();

  useEffect(() => {
    api.siteSetting
      .getHomepage({})
      .then((res) => {
        const data = toLowerCamelCase(res.data);
        setHomepageHtml(data.html);
        setHomepageCss(data.css);
        setHomepageWelcome(data.homepageWelcome);
      })
      .catch(() => {
        setHomepageHtml('');
        setHomepageCss('');
        setHomepageWelcome('');
      });
  }, []);

  return homepageHtml === undefined ? (
    <div
      css={css`
        width: 100vw;
        height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
      `}
    >
      <Spin />
    </div>
  ) : homepageHtml === '' ? (
    <div
      css={css`
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: stretch;
        align-items: stretch;
        .Index__Title {
          flex: auto;
          display: flex;
          justify-content: center;
          align-items: center;
          img {
            max-height: 300px;
          }
        }
        .Index__Footer {
          height: 50px;
          text-align: center;
          a {
            font-size: 16px;
          }
        }
        .Index__Welcome {
          max-width: 720px;
          margin: 0 auto 24px;
          padding: 0 24px;
          text-align: center;
          white-space: pre-wrap;
        }
      `}
    >
      <Global
        styles={css`
          #root {
            width: 100%;
            height: 100%;
          }
        `}
      />
      <Header />
      <div className="Index__Title">
        <img src={brandJump} alt="Mascot" />
      </div>
      {homepageWelcome && (
        <div className="Index__Welcome">{homepageWelcome}</div>
      )}
      <div className="Index__Footer">{/* 备案号 */}</div>
    </div>
  ) : (
    <>
      <Global
        styles={css`
          ${homepageCss}
        `}
      />
      <div
        id="homepage"
        className="Index_Homepage"
        dangerouslySetInnerHTML={{ __html: homepageHtml }}
      />
    </>
  );
};
