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
import { getSafeImageUrl, renderBBCode } from '../utils/bbcode';

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
  const [homepageImageUrl, setHomepageImageUrl] = useState('');

  useEffect(() => {
    api.siteSetting
      .getHomepage({})
      .then((res) => {
        const data = toLowerCamelCase(res.data);
        setHomepageHtml(data.html);
        setHomepageCss(data.css);
        setHomepageWelcome(data.homepageWelcome);
        setHomepageImageUrl(data.homepageImageUrl || '');
      })
      .catch(() => {
        setHomepageHtml('');
        setHomepageCss('');
        setHomepageWelcome('');
        setHomepageImageUrl('');
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
        position: relative;
        min-height: 100vh;
        --index-title-height: clamp(144px, 28vh, 260px);
        .Index__Title {
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: var(--index-title-height);
          padding: 16px 24px;
          display: flex;
          justify-content: center;
          align-items: center;
          transform: translateY(-50%);
          img {
            max-width: min(80vw, 420px);
            max-height: min(24vh, 220px);
            object-fit: contain;
          }
        }
        .Index__Footer {
          position: absolute;
          right: 0;
          bottom: 0;
          left: 0;
          height: 50px;
          text-align: center;
          a {
            font-size: 16px;
          }
        }
        .Index__Welcome {
          position: absolute;
          top: calc(50% + clamp(72px, 14vh, 130px) + 24px);
          right: 0;
          left: 0;
          max-width: 720px;
          margin: 0 auto 24px;
          padding: 0 24px;
          text-align: center;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          img {
            max-width: 100%;
            height: auto;
            vertical-align: middle;
          }
          a {
            overflow-wrap: anywhere;
          }
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
        <img
          src={getSafeImageUrl(homepageImageUrl) || brandJump}
          alt="Mascot"
        />
      </div>
      {homepageWelcome && (
        <div className="Index__Welcome">{renderBBCode(homepageWelcome)}</div>
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
