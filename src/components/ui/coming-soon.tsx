import React from "react";
import styled from "styled-components";
import { tokens as t } from "./tokens";
import { Construction } from "lucide-react";

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 360px;
  gap: 16px;
  text-align: center;
  padding: 40px 20px;
`;

const IconWrap = styled.div`
  width: 64px;
  height: 64px;
  border-radius: ${t.radiusLg};
  background: ${t.colorBgNeutral};
  border: 1px solid ${t.colorBorder};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${t.colorTextSubtle};
  svg { width: 28px; height: 28px; }
`;

const Title = styled.h2`
  margin: 0;
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeLg};
  font-weight: 600;
  color: ${t.colorText};
`;

const Sub = styled.p`
  margin: 0;
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeMd};
  color: ${t.colorTextSubtle};
  max-width: 400px;
  line-height: 1.6;
`;

const Pill = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: ${t.radiusFull};
  background: ${t.colorWarningSubtlest};
  border: 1px solid ${t.colorBorderWarning};
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeSm};
  font-weight: 600;
  color: ${t.colorTextWarning};
`;

export function ComingSoon({ title, description }: { title: string; description?: string }) {
  return (
    <Wrap>
      <IconWrap><Construction /></IconWrap>
      <Pill>Đang phát triển</Pill>
      <Title>{title}</Title>
      <Sub>{description ?? "Tính năng này đang được xây dựng và sẽ sớm ra mắt trong phiên bản tiếp theo."}</Sub>
    </Wrap>
  );
}
