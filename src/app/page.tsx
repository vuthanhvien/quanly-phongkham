"use client";

import React, { useState, useRef, useEffect } from "react";
import styled, { keyframes, css } from "styled-components";
import { tokens as t } from "@/components/ui/tokens";
import {
  Building2, Send, Bot, User, MessageCircle, X,
  Sparkles, Star, Phone, MapPin, Clock, ChevronRight,
  Syringe, Eye, Zap, Leaf, Shield, HeartPulse,
  CheckCircle2, ArrowRight, Share2, Link2, Play,
} from "lucide-react";

// ─── Keyframes ──────────────────────────────────────────────────────────────

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
  40%            { transform: scale(1); opacity: 1; }
`;

const ripple = keyframes`
  0%   { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(1.8); opacity: 0; }
`;


// ─── Global Layout ───────────────────────────────────────────────────────────

const Page = styled.div`
  min-height: 100vh;
  background: #fff;
  font-family: ${t.fontFamily};
`;

// ─── Header ─────────────────────────────────────────────────────────────────

const HeaderWrap = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 48px;
  height: 64px;
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(9,30,66,0.07);
  position: sticky;
  top: 0;
  z-index: 100;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const LogoIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #0C66E4, #388BFF);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  svg { width: 20px; height: 20px; }
`;

const LogoText = styled.div``;
const LogoName = styled.div`
  font-size: 16px;
  font-weight: 800;
  color: ${t.colorText};
  letter-spacing: -0.3px;
`;
const LogoSub = styled.div`
  font-size: 10px;
  color: ${t.colorTextSubtlest};
  font-weight: 500;
  letter-spacing: 0.5px;
  text-transform: uppercase;
`;

const Nav = styled.nav`
  display: flex;
  align-items: center;
  gap: 4px;
  @media (max-width: 768px) { display: none; }
`;

const NavLink = styled.a`
  font-size: 13px;
  font-weight: 500;
  color: ${t.colorTextSubtle};
  text-decoration: none;
  padding: 6px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 100ms;
  &:hover { color: ${t.colorText}; background: ${t.colorBgNeutral}; }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

// const BtnOutline = styled.a`
//   font-size: 13px;
//   font-weight: 500;
//   color: ${t.colorTextSubtle};
//   text-decoration: none;
//   padding: 7px 16px;
//   border: 1px solid ${t.colorBorder};
//   border-radius: 8px;
//   cursor: pointer;
//   transition: all 100ms;
//   &:hover { color: ${t.colorText}; border-color: ${t.colorBorderInputHovered}; }
// `;

const BtnPrimary = styled.a`
  font-size: 13px;
  font-weight: 600;
  color: white;
  text-decoration: none;
  padding: 8px 18px;
  background: linear-gradient(135deg, #0C66E4, #388BFF);
  border-radius: 8px;
  cursor: pointer;
  transition: all 100ms;
  box-shadow: 0 2px 8px rgba(12,102,228,0.35);
  &:hover { background: linear-gradient(135deg, #0055CC, #0C66E4); box-shadow: 0 4px 14px rgba(12,102,228,0.45); }
`;

// ─── Hero ────────────────────────────────────────────────────────────────────

const HeroSection = styled.section`
  position: relative;
  min-height: 88vh;
  display: flex;
  align-items: center;
  overflow: hidden;
`;

const HeroBg = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #0A1628 0%, #0C3460 40%, #1B5FA8 70%, #2176D2 100%);
`;

const HeroBgImg = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.18;
  mix-blend-mode: luminosity;
`;

const HeroGrid = styled.div`
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 60px 60px;
`;

const HeroGlow = styled.div`
  position: absolute;
  top: -20%;
  right: -10%;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(56,139,255,0.25) 0%, transparent 70%);
  pointer-events: none;
`;

const HeroContent = styled.div`
  position: relative;
  z-index: 2;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 48px;
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 64px;
  align-items: center;
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    padding: 0 24px;
    text-align: center;
  }
`;

const HeroLeft = styled.div`
  animation: ${fadeInUp} 0.6s ease both;
`;

const HeroBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255,255,255,0.85);
  margin-bottom: 20px;
  backdrop-filter: blur(8px);
  svg { width: 12px; height: 12px; color: #88C4FF; }
`;

const HeroTitle = styled.h1`
  margin: 0 0 12px;
  font-size: 52px;
  font-weight: 900;
  color: #fff;
  line-height: 1.1;
  letter-spacing: -1.5px;
  span {
    background: linear-gradient(90deg, #88C4FF, #B3D9FF);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  @media (max-width: 768px) { font-size: 36px; }
`;

const HeroDesc = styled.p`
  margin: 0 0 32px;
  font-size: 16px;
  line-height: 1.7;
  color: rgba(255,255,255,0.65);
`;

const HeroActions = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
`;

const HeroBtnPrimary = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  background: #fff;
  color: #0C66E4;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 150ms;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
  &:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(0,0,0,0.3); }
  svg { width: 16px; height: 16px; }
`;

const HeroBtnSecondary = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 24px;
  background: transparent;
  color: rgba(255,255,255,0.85);
  border: 1.5px solid rgba(255,255,255,0.25);
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms;
  backdrop-filter: blur(8px);
  &:hover { border-color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.07); }
  svg { width: 16px; height: 16px; }
`;

const HeroStats = styled.div`
  display: flex;
  gap: 32px;
  margin-top: 40px;
  padding-top: 32px;
  border-top: 1px solid rgba(255,255,255,0.1);
  @media (max-width: 900px) { justify-content: center; }
`;

const HeroStat = styled.div``;
const HeroStatNum = styled.div`
  font-size: 28px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.5px;
`;
const HeroStatLabel = styled.div`
  font-size: 12px;
  color: rgba(255,255,255,0.5);
  margin-top: 2px;
`;

const HeroRight = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  animation: ${fadeInUp} 0.6s ease 0.15s both;
  @media (max-width: 900px) { display: none; }
`;

const HeroImageGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 12px;
  width: 420px;
`;

const HeroImg = styled.img<{ $tall?: boolean }>`
  width: 100%;
  border-radius: 16px;
  object-fit: cover;
  ${(p) => p.$tall && css`grid-row: span 2;`}
  height: ${(p) => p.$tall ? "320px" : "154px"};
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
`;

// ─── Section shell ───────────────────────────────────────────────────────────

const Section = styled.section<{ $bg?: string }>`
  padding: 80px 0;
  background: ${(p) => p.$bg ?? "#fff"};
`;

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 48px;
  @media (max-width: 768px) { padding: 0 24px; }
`;

const SectionLabel = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: ${t.colorBrandSubtlest};
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
  color: ${t.colorTextBrand};
  margin-bottom: 12px;
  svg { width: 12px; height: 12px; }
`;

const SectionTitle = styled.h2`
  margin: 0 0 10px;
  font-size: 36px;
  font-weight: 800;
  color: ${t.colorText};
  letter-spacing: -0.8px;
`;

const SectionSub = styled.p`
  margin: 0;
  font-size: 15px;
  color: ${t.colorTextSubtle};
  line-height: 1.6;
  max-width: 560px;
`;

// ─── Services ────────────────────────────────────────────────────────────────

const ServicesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-top: 40px;
  @media (max-width: 900px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 600px) { grid-template-columns: 1fr; }
`;

const ServiceCard = styled.div`
  background: #fff;
  border: 1px solid ${t.colorBorder};
  border-radius: 16px;
  padding: 28px;
  cursor: pointer;
  transition: all 200ms;
  position: relative;
  overflow: hidden;
  &:hover {
    border-color: ${t.colorBrandBold};
    box-shadow: 0 8px 32px rgba(12,102,228,0.12);
    transform: translateY(-3px);
  }
  &:hover .svc-arrow { transform: translate(2px, -2px); opacity: 1; }
`;

const ServiceIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${t.colorBrandSubtlest};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${t.colorBrandBold};
  margin-bottom: 16px;
  svg { width: 22px; height: 22px; }
`;

const ServiceTitle = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${t.colorText};
  margin-bottom: 8px;
`;

const ServiceDesc = styled.div`
  font-size: 13px;
  color: ${t.colorTextSubtle};
  line-height: 1.6;
`;

const ServiceArrow = styled.div`
  position: absolute;
  top: 24px;
  right: 24px;
  color: ${t.colorTextBrand};
  opacity: 0;
  transition: all 200ms;
  svg { width: 18px; height: 18px; }
`;

const ServiceTag = styled.div`
  display: inline-block;
  margin-top: 14px;
  padding: 3px 10px;
  background: ${t.colorBrandSubtlest};
  border-radius: 100px;
  font-size: 11px;
  font-weight: 600;
  color: ${t.colorTextBrand};
`;

// ─── Stats Bar ───────────────────────────────────────────────────────────────

const StatsBar = styled.div`
  background: linear-gradient(135deg, #0A1628 0%, #0C3460 100%);
  padding: 48px 0;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 32px;
  @media (max-width: 768px) { grid-template-columns: repeat(2, 1fr); }
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatNum = styled.div`
  font-size: 42px;
  font-weight: 900;
  color: #fff;
  letter-spacing: -1px;
  line-height: 1;
  margin-bottom: 6px;
`;

const StatLabel = styled.div`
  font-size: 13px;
  color: rgba(255,255,255,0.5);
  font-weight: 500;
`;

// ─── Gallery ─────────────────────────────────────────────────────────────────

const GalleryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: auto auto;
  gap: 12px;
  margin-top: 40px;
  @media (max-width: 768px) { grid-template-columns: repeat(2, 1fr); }
`;

const GalleryItem = styled.div<{ $span?: string }>`
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  ${(p) => p.$span && css`grid-column: ${p.$span};`}
  &:hover img { transform: scale(1.05); }
  &:hover .gallery-overlay { opacity: 1; }
`;

const GalleryImg = styled.img`
  width: 100%;
  height: 220px;
  object-fit: cover;
  transition: transform 400ms ease;
  display: block;
`;

const GalleryOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(9,30,66,0.6) 0%, transparent 50%);
  opacity: 0;
  transition: opacity 300ms;
  display: flex;
  align-items: flex-end;
  padding: 16px;
`;

const GalleryLabel = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #fff;
`;

// ─── Why Us ──────────────────────────────────────────────────────────────────

const WhyGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: center;
  margin-top: 16px;
  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const WhyLeft = styled.img`
  width: 100%;
  height: 460px;
  object-fit: cover;
  border-radius: 24px;
  box-shadow: 0 16px 48px rgba(9,30,66,0.12);
`;

const WhyRight = styled.div``;

const WhyItems = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 28px;
`;

const WhyItem = styled.div`
  display: flex;
  gap: 14px;
  align-items: flex-start;
`;

const WhyIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: ${t.colorBrandSubtlest};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${t.colorBrandBold};
  flex-shrink: 0;
  svg { width: 17px; height: 17px; }
`;

const WhyBody = styled.div``;
const WhyItemTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${t.colorText};
  margin-bottom: 4px;
`;
const WhyItemDesc = styled.div`
  font-size: 13px;
  color: ${t.colorTextSubtle};
  line-height: 1.6;
`;

// ─── Blog ────────────────────────────────────────────────────────────────────

const BlogGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-top: 40px;
  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const BlogCard = styled.article`
  border: 1px solid ${t.colorBorder};
  border-radius: 16px;
  overflow: hidden;
  background: #fff;
  cursor: pointer;
  transition: all 200ms;
  &:hover {
    box-shadow: 0 8px 32px rgba(9,30,66,0.1);
    transform: translateY(-3px);
    border-color: ${t.colorBrandSubtle};
  }
`;

const BlogImg = styled.img`
  width: 100%;
  height: 200px;
  object-fit: cover;
  transition: transform 400ms;
  ${BlogCard}:hover & { transform: scale(1.04); }
`;

const BlogBody = styled.div`
  padding: 20px;
`;

const BlogMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
`;

const BlogTag = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${t.colorTextBrand};
  background: ${t.colorBrandSubtlest};
  padding: 2px 8px;
  border-radius: 100px;
`;

const BlogDate = styled.span`
  font-size: 11px;
  color: ${t.colorTextSubtlest};
`;

const BlogTitle = styled.h3`
  margin: 0 0 8px;
  font-size: 15px;
  font-weight: 700;
  color: ${t.colorText};
  line-height: 1.45;
`;

const BlogExcerpt = styled.p`
  margin: 0 0 14px;
  font-size: 13px;
  color: ${t.colorTextSubtle};
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const BlogReadMore = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: ${t.colorTextBrand};
  svg { width: 14px; height: 14px; transition: transform 150ms; }
  ${BlogCard}:hover & svg { transform: translateX(3px); }
`;

// ─── Testimonials ─────────────────────────────────────────────────────────────

const TestimonialsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-top: 40px;
  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const TestiCard = styled.div`
  background: #fff;
  border: 1px solid ${t.colorBorder};
  border-radius: 16px;
  padding: 24px;
`;

const Stars = styled.div`
  display: flex;
  gap: 3px;
  margin-bottom: 12px;
  color: #F59E0B;
  svg { width: 15px; height: 15px; }
`;

const TestiText = styled.p`
  margin: 0 0 16px;
  font-size: 14px;
  color: ${t.colorTextSubtle};
  line-height: 1.65;
  font-style: italic;
`;

const TestiAuthor = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const TestiAvatar = styled.div<{ $color: string }>`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${(p) => p.$color};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
`;

const TestiName = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${t.colorText};
`;

const TestiSub = styled.div`
  font-size: 11px;
  color: ${t.colorTextSubtlest};
`;

// ─── CTA Banner ──────────────────────────────────────────────────────────────

const CtaSection = styled.section`
  background: linear-gradient(135deg, #0A1628 0%, #0C3460 60%, #1B5FA8 100%);
  padding: 72px 0;
  position: relative;
  overflow: hidden;
`;

const CtaGlow = styled.div`
  position: absolute;
  bottom: -100px;
  left: -100px;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(56,139,255,0.2) 0%, transparent 70%);
  pointer-events: none;
`;

const CtaContent = styled.div`
  position: relative;
  z-index: 1;
  text-align: center;
`;

const CtaTitle = styled.h2`
  margin: 0 0 12px;
  font-size: 40px;
  font-weight: 900;
  color: #fff;
  letter-spacing: -0.8px;
  span {
    background: linear-gradient(90deg, #88C4FF, #B3D9FF);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
`;

const CtaDesc = styled.p`
  margin: 0 0 32px;
  font-size: 16px;
  color: rgba(255,255,255,0.6);
`;

const CtaActions = styled.div`
  display: flex;
  gap: 14px;
  justify-content: center;
  flex-wrap: wrap;
`;

const CtaBtnPrimary = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 30px;
  background: #fff;
  color: #0C66E4;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 150ms;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
  &:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(0,0,0,0.3); }
  svg { width: 16px; height: 16px; }
`;

const CtaBtnSecondary = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 24px;
  background: transparent;
  color: rgba(255,255,255,0.85);
  border: 1.5px solid rgba(255,255,255,0.25);
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms;
  &:hover { border-color: rgba(255,255,255,0.5); }
  svg { width: 16px; height: 16px; }
`;

// ─── Footer ───────────────────────────────────────────────────────────────────

const FooterWrap = styled.footer`
  background: #0A1628;
  padding: 56px 0 24px;
`;

const FooterGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 40px;
  margin-bottom: 40px;
  @media (max-width: 900px) { grid-template-columns: 1fr 1fr; }
  @media (max-width: 600px) { grid-template-columns: 1fr; }
`;

const FooterBrand = styled.div``;
const FooterLogo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
`;
const FooterLogoIcon = styled.div`
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: linear-gradient(135deg, #0C66E4, #388BFF);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  svg { width: 18px; height: 18px; }
`;
const FooterLogoName = styled.div`
  font-size: 16px;
  font-weight: 800;
  color: #fff;
`;
const FooterDesc = styled.p`
  font-size: 13px;
  color: rgba(255,255,255,0.4);
  line-height: 1.7;
  margin: 0 0 20px;
  max-width: 280px;
`;
const SocialLinks = styled.div`
  display: flex;
  gap: 8px;
`;
const SocialBtn = styled.a`
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.4);
  cursor: pointer;
  transition: all 150ms;
  &:hover { border-color: rgba(255,255,255,0.3); color: #fff; background: rgba(255,255,255,0.05); }
  svg { width: 16px; height: 16px; }
`;

const FooterCol = styled.div``;
const FooterColTitle = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 16px;
`;
const FooterLinks = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;
const FooterLink = styled.a`
  font-size: 13px;
  color: rgba(255,255,255,0.4);
  text-decoration: none;
  cursor: pointer;
  transition: color 150ms;
  &:hover { color: rgba(255,255,255,0.8); }
`;

const FooterDivider = styled.div`
  border-top: 1px solid rgba(255,255,255,0.06);
  padding-top: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
`;
const FooterCopy = styled.div`
  font-size: 12px;
  color: rgba(255,255,255,0.3);
`;

const FooterContact = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;
const FooterContactItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgba(255,255,255,0.4);
  svg { width: 14px; height: 14px; flex-shrink: 0; }
`;

// ─── Chat Widget ─────────────────────────────────────────────────────────────

const ChatFab = styled.button<{ $open: boolean }>`
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 999;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0C66E4, #388BFF);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(12,102,228,0.5);
  transition: all 200ms;
  &:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(12,102,228,0.6); }
  svg { width: 24px; height: 24px; transition: all 200ms; }
`;

const ChatRipple = styled.div`
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 998;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(12,102,228,0.3);
  animation: ${ripple} 2.5s ease-out infinite;
  pointer-events: none;
`;

const ChatPanel = styled.div<{ $open: boolean }>`
  position: fixed;
  bottom: 92px;
  right: 24px;
  z-index: 998;
  width: 360px;
  max-height: 560px;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 16px 48px rgba(9,30,66,0.2), 0 0 0 1px rgba(9,30,66,0.06);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  opacity: ${(p) => (p.$open ? 1 : 0)};
  transform: ${(p) => (p.$open ? "translateY(0) scale(1)" : "translateY(12px) scale(0.96)")};
  pointer-events: ${(p) => (p.$open ? "all" : "none")};
  transition: all 250ms ${t.ease};
  @media (max-width: 480px) { width: calc(100vw - 32px); right: 16px; }
`;

const ChatPanelHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  background: linear-gradient(135deg, #0A1628, #0C3460);
  flex-shrink: 0;
`;

const ChatBotAvatar = styled.div`
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0C66E4, #388BFF);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
  svg { width: 18px; height: 18px; }
`;

const ChatBotInfo = styled.div`
  flex: 1;
`;
const ChatBotName = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #fff;
`;
const ChatBotStatus = styled.div`
  font-size: 11px;
  color: rgba(255,255,255,0.5);
  display: flex;
  align-items: center;
  gap: 5px;
  &::before {
    content: '';
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #22C55E;
  }
`;

const ChatCloseBtn = styled.button`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 150ms;
  &:hover { background: rgba(255,255,255,0.2); color: #fff; }
  svg { width: 14px; height: 14px; }
`;

const ChatMessages = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: ${t.colorBgNeutral};
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: ${t.colorBorder}; border-radius: 4px; }
`;

const MsgRow = styled.div<{ $isUser: boolean }>`
  display: flex;
  align-items: flex-end;
  gap: 8px;
  flex-direction: ${(p) => (p.$isUser ? "row-reverse" : "row")};
  animation: ${fadeIn} 0.2s ease;
`;

const MsgAvatar = styled.div<{ $isUser: boolean }>`
  width: 26px;
  height: 26px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${(p) => (p.$isUser ? t.colorBrandBold : "#fff")};
  border: 1px solid ${(p) => (p.$isUser ? t.colorBrandBold : t.colorBorder)};
  color: ${(p) => (p.$isUser ? "#fff" : t.colorText)};
  svg { width: 12px; height: 12px; }
`;

const MsgBubble = styled.div<{ $isUser: boolean }>`
  max-width: 80%;
  padding: 9px 13px;
  border-radius: ${(p) => (p.$isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px")};
  background: ${(p) => (p.$isUser ? t.colorBrandBold : "#fff")};
  border: 1px solid ${(p) => (p.$isUser ? t.colorBrandBold : t.colorBorder)};
  color: ${(p) => (p.$isUser ? "#fff" : t.colorText)};
  font-size: 13px;
  line-height: 1.55;
  white-space: pre-wrap;
`;

const TypingDots = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 14px;
  background: #fff;
  border: 1px solid ${t.colorBorder};
  border-radius: 14px 14px 14px 4px;
  width: fit-content;
`;

const Dot = styled.span<{ $i: number }>`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: ${t.colorTextSubtle};
  display: inline-block;
  animation: ${pulse} 1.2s ease-in-out ${(p) => p.$i * 0.2}s infinite;
`;

const ChatQuickReplies = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 16px;
  background: ${t.colorBgNeutral};
  border-top: 1px solid ${t.colorBorder};
`;

const QuickBtn = styled.button`
  padding: 5px 12px;
  border-radius: 100px;
  border: 1px solid ${t.colorBorder};
  background: #fff;
  font-size: 11px;
  font-weight: 500;
  color: ${t.colorText};
  cursor: pointer;
  transition: all 100ms;
  &:hover { border-color: ${t.colorBrandBold}; color: ${t.colorBrandBold}; background: ${t.colorBrandSubtlest}; }
`;

const ChatInputBar = styled.div`
  display: flex;
  gap: 8px;
  align-items: flex-end;
  padding: 12px 14px;
  background: #fff;
  border-top: 1px solid ${t.colorBorder};
  flex-shrink: 0;
`;

const ChatInput = styled.textarea`
  flex: 1;
  border: 1px solid ${t.colorBorderInput};
  border-radius: 10px;
  outline: none;
  background: ${t.colorBgNeutral};
  font-family: ${t.fontFamily};
  font-size: 13px;
  color: ${t.colorText};
  resize: none;
  padding: 8px 12px;
  min-height: 36px;
  max-height: 80px;
  line-height: 1.5;
  transition: border-color 100ms;
  &::placeholder { color: ${t.colorTextSubtlest}; }
  &:focus { border-color: ${t.colorBorderFocused}; background: #fff; }
`;

const ChatSendBtn = styled.button<{ $active: boolean }>`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: none;
  background: ${(p) => (p.$active ? "linear-gradient(135deg,#0C66E4,#388BFF)" : t.colorBgNeutral)};
  color: ${(p) => (p.$active ? "#fff" : t.colorTextSubtlest)};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ${(p) => (p.$active ? "pointer" : "default")};
  transition: all 150ms;
  flex-shrink: 0;
  svg { width: 15px; height: 15px; }
`;

// ─── Data ─────────────────────────────────────────────────────────────────────

const SERVICES = [
  { icon: <Syringe />, title: "Tiêm Filler & Botox", desc: "Làm đầy khuyết điểm, xóa nếp nhăn, trẻ hóa làn da an toàn và hiệu quả tức thì.", tag: "Phổ biến nhất" },
  { icon: <Eye />, title: "Cắt Mí Mắt", desc: "Phẫu thuật tạo hình mí mắt đôi tự nhiên, đôi mắt to tròn sáng hơn.", tag: "Thẩm mỹ" },
  { icon: <Sparkles />, title: "Nâng Mũi Cao", desc: "Chỉnh hình sống mũi, nâng đầu mũi, tạo dáng mũi cân đối hài hòa.", tag: "Phẫu thuật" },
  { icon: <Zap />, title: "Laser Điều Trị", desc: "Xóa tàn nhang, nám, mụn, tái tạo da chuyên sâu bằng công nghệ laser thế hệ mới.", tag: "Công nghệ" },
  { icon: <Leaf />, title: "Trẻ Hóa Da", desc: "Liệu trình chăm sóc da chuyên sâu, phục hồi độ đàn hồi và làm sáng đều màu da.", tag: "Chăm sóc" },
  { icon: <HeartPulse />, title: "Tư Vấn Thẩm Mỹ", desc: "Đội ngũ bác sĩ chuyên khoa tư vấn giải pháp làm đẹp phù hợp với từng khách hàng.", tag: "Miễn phí" },
];

const GALLERY = [
  { src: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop", label: "Phòng khám hiện đại", span: undefined },
  { src: "https://images.unsplash.com/photo-1629909615184-74f495363b67?w=800&h=600&fit=crop", label: "Trang thiết bị tiên tiến", span: "span 2" },
  { src: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=600&fit=crop", label: "Không gian sang trọng", span: undefined },
  { src: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&h=600&fit=crop", label: "Dịch vụ chuyên nghiệp", span: undefined },
  { src: "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=800&h=600&fit=crop", label: "Đội ngũ bác sĩ", span: undefined },
];

const BLOG_POSTS = [
  {
    img: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&h=400&fit=crop",
    tag: "Làm đẹp",
    date: "10 tháng 4, 2026",
    title: "5 Điều Cần Biết Trước Khi Quyết Định Nâng Mũi",
    excerpt: "Nâng mũi là một trong những ca phẫu thuật thẩm mỹ phổ biến nhất. Tuy nhiên, trước khi đưa ra quyết định, bạn cần hiểu rõ về quy trình, rủi ro và kết quả mong đợi để có lựa chọn phù hợp nhất.",
  },
  {
    img: "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=600&h=400&fit=crop",
    tag: "Chăm sóc da",
    date: "5 tháng 4, 2026",
    title: "Tiêm Filler Môi: Những Điều Không Ai Nói Với Bạn",
    excerpt: "Filler môi giúp tạo vẻ đẹp quyến rũ nhưng có những sự thật bạn cần biết trước khi thực hiện — từ cơn đau, thời gian phục hồi đến tần suất tái tiêm cần thiết.",
  },
  {
    img: "https://images.unsplash.com/photo-1559599238-308793637427?w=600&h=400&fit=crop",
    tag: "Phục hồi",
    date: "28 tháng 3, 2026",
    title: "Chăm Sóc Da Sau Liệu Trình Laser — Bí Quyết Phục Hồi Nhanh",
    excerpt: "Sau liệu trình laser, làn da của bạn cần được chăm sóc đặc biệt để đạt kết quả tốt nhất. Hãy khám phá quy trình skincare đúng chuẩn từ đội ngũ bác sĩ của chúng tôi.",
  },
];

const TESTIMONIALS = [
  {
    text: "Tôi rất hài lòng với kết quả cắt mí mắt. Bác sĩ tư vấn rất kỹ lưỡng, phòng khám sạch sẽ, chuyên nghiệp. Mắt tôi trông tự nhiên hơn nhiều so với tưởng tượng!",
    name: "Nguyễn Thị Lan",
    sub: "Khách hàng từ năm 2024",
    initials: "NL",
    color: "#7C3AED",
  },
  {
    text: "Đặt lịch qua AI chatbot siêu tiện, được nhắc lịch đúng giờ. Tiêm botox xong không đau, nhân viên nhiệt tình. Sẽ quay lại lần sau!",
    name: "Trần Minh Châu",
    sub: "Khách hàng từ năm 2025",
    initials: "TC",
    color: "#059669",
  },
  {
    text: "Lần đầu đến phòng khám thẩm mỹ nhưng được tư vấn rất tận tâm. Liệu trình laser trẻ hóa da cho kết quả ngoài mong đợi, da mịn và sáng rõ rệt.",
    name: "Lê Phương Thảo",
    sub: "Khách hàng từ năm 2025",
    initials: "LT",
    color: "#DC2626",
  },
];

const QUICK_REPLIES = ["Tư vấn nâng mũi", "Cắt mí mắt", "Tiêm filler / botox", "Đặt lịch ngay"];

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const INITIAL_MESSAGE: ChatMessage = {
  role: "assistant",
  content: "Xin chào! 👋 Tôi là trợ lý AI của Phòng Khám. Tôi có thể giúp bạn tìm hiểu dịch vụ và đặt lịch hẹn. Bạn quan tâm đến dịch vụ nào?",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiMessages, setApiMessages] = useState<{ role: string; content: unknown }[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (chatOpen) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, chatOpen]);

  const autoResize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 80) + "px";
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setLoading(true);

    const newApiMsgs = [...apiMessages, { role: "user", content: trimmed }];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newApiMsgs }),
      });
      const data = await res.json();
      if (data.error) {
        setMessages([...newMessages, { role: "assistant", content: "Xin lỗi, có lỗi xảy ra. Vui lòng thử lại." }]);
      } else {
        setMessages([...newMessages, { role: "assistant", content: data.text }]);
        setApiMessages(data.messages);
      }
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Không thể kết nối. Vui lòng thử lại." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const showQuickReplies = messages.length === 1 && !loading;

  return (
    <Page>
      {/* ── Header ── */}
      <HeaderWrap>
        <Logo>
          <LogoIcon><Building2 /></LogoIcon>
          <LogoText>
            <LogoName>Phòng Khám</LogoName>
            <LogoSub>Thẩm mỹ & Chăm sóc da</LogoSub>
          </LogoText>
        </Logo>
        <Nav>
          <NavLink onClick={() => scrollToSection("services")}>Dịch vụ</NavLink>
          <NavLink onClick={() => scrollToSection("gallery")}>Hình ảnh</NavLink>
          <NavLink onClick={() => scrollToSection("blog")}>Bài viết</NavLink>
          <NavLink onClick={() => scrollToSection("contact")}>Liên hệ</NavLink>
        </Nav>
        <HeaderActions>
          {/* <BtnOutline as={Link} href="/login">Quản lý</BtnOutline> */}
          <BtnPrimary onClick={() => setChatOpen(true)}>Đặt lịch ngay</BtnPrimary>
        </HeaderActions>
      </HeaderWrap>

      {/* ── Hero ── */}
      <HeroSection>
        <HeroBg />
        <HeroBgImg
          src="https://images.unsplash.com/photo-1629909615184-74f495363b67?w=1920&fit=crop"
          alt=""
        />
        <HeroGrid />
        <HeroGlow />
        <HeroContent>
          <HeroLeft>
            <HeroBadge>
              <Sparkles /> Đội ngũ bác sĩ chuyên gia hàng đầu
            </HeroBadge>
            <HeroTitle>
              Vẻ đẹp<br />
              <span>hoàn hảo</span><br />
              bắt đầu từ đây
            </HeroTitle>
            <HeroDesc>
              Phòng khám thẩm mỹ chuyên sâu với hơn 15 năm kinh nghiệm. Chúng tôi mang đến giải pháp làm đẹp an toàn, hiệu quả và phù hợp với từng khách hàng.
            </HeroDesc>
            <HeroActions>
              <HeroBtnPrimary onClick={() => setChatOpen(true)}>
                <MessageCircle /> Đặt lịch tư vấn
              </HeroBtnPrimary>
              <HeroBtnSecondary onClick={() => scrollToSection("services")}>
                Xem dịch vụ <ChevronRight />
              </HeroBtnSecondary>
            </HeroActions>
            <HeroStats>
              <HeroStat>
                <HeroStatNum>10K+</HeroStatNum>
                <HeroStatLabel>Khách hàng tin tưởng</HeroStatLabel>
              </HeroStat>
              <HeroStat>
                <HeroStatNum>15+</HeroStatNum>
                <HeroStatLabel>Năm kinh nghiệm</HeroStatLabel>
              </HeroStat>
              <HeroStat>
                <HeroStatNum>98%</HeroStatNum>
                <HeroStatLabel>Hài lòng</HeroStatLabel>
              </HeroStat>
            </HeroStats>
          </HeroLeft>
          <HeroRight>
            <HeroImageGrid>
              <HeroImg
                $tall
                src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=800&fit=crop"
                alt="Clinic"
              />
              <HeroImg
                src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&h=400&fit=crop"
                alt="Treatment"
              />
              <HeroImg
                src="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&h=400&fit=crop"
                alt="Skincare"
              />
            </HeroImageGrid>
          </HeroRight>
        </HeroContent>
      </HeroSection>

      {/* ── Services ── */}
      <Section id="services">
        <Container>
          <SectionLabel><Sparkles /> Dịch vụ của chúng tôi</SectionLabel>
          <SectionTitle>Giải pháp làm đẹp<br />toàn diện cho bạn</SectionTitle>
          <SectionSub>Từ thẩm mỹ phẫu thuật đến chăm sóc da không xâm lấn — chúng tôi có đầy đủ dịch vụ để giúp bạn tự tin hơn mỗi ngày.</SectionSub>
          <ServicesGrid>
            {SERVICES.map((s) => (
              <ServiceCard key={s.title} onClick={() => setChatOpen(true)}>
                <ServiceArrow className="svc-arrow"><ArrowRight /></ServiceArrow>
                <ServiceIcon>{s.icon}</ServiceIcon>
                <ServiceTitle>{s.title}</ServiceTitle>
                <ServiceDesc>{s.desc}</ServiceDesc>
                <ServiceTag>{s.tag}</ServiceTag>
              </ServiceCard>
            ))}
          </ServicesGrid>
        </Container>
      </Section>

      {/* ── Stats ── */}
      <StatsBar>
        <Container>
          <StatsGrid>
            <StatItem>
              <StatNum>10,000+</StatNum>
              <StatLabel>Khách hàng tin tưởng</StatLabel>
            </StatItem>
            <StatItem>
              <StatNum>15+</StatNum>
              <StatLabel>Năm kinh nghiệm</StatLabel>
            </StatItem>
            <StatItem>
              <StatNum>50+</StatNum>
              <StatLabel>Dịch vụ đa dạng</StatLabel>
            </StatItem>
            <StatItem>
              <StatNum>98%</StatNum>
              <StatLabel>Khách hàng hài lòng</StatLabel>
            </StatItem>
          </StatsGrid>
        </Container>
      </StatsBar>

      {/* ── Gallery ── */}
      <Section id="gallery" $bg={t.colorBgNeutral}>
        <Container>
          <SectionLabel><Building2 /> Hình ảnh phòng khám</SectionLabel>
          <SectionTitle>Không gian<br />hiện đại & chuyên nghiệp</SectionTitle>
          <GalleryGrid>
            {GALLERY.map((g, i) => (
              <GalleryItem key={i} $span={g.span}>
                <GalleryImg src={g.src} alt={g.label} />
                <GalleryOverlay className="gallery-overlay">
                  <GalleryLabel>{g.label}</GalleryLabel>
                </GalleryOverlay>
              </GalleryItem>
            ))}
          </GalleryGrid>
        </Container>
      </Section>

      {/* ── Why Us ── */}
      <Section>
        <Container>
          <WhyGrid>
            <WhyLeft
              src="https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=800&h=900&fit=crop"
              alt="Doctor"
            />
            <WhyRight>
              <SectionLabel><Shield /> Vì sao chọn chúng tôi</SectionLabel>
              <SectionTitle>Tiêu chuẩn<br />quốc tế, tận tâm<br />như người thân</SectionTitle>
              <WhyItems>
                {[
                  { icon: <CheckCircle2 />, title: "Bác sĩ chuyên khoa giàu kinh nghiệm", desc: "Đội ngũ 20+ bác sĩ được đào tạo tại các trường y khoa hàng đầu trong và ngoài nước." },
                  { icon: <Shield />, title: "Công nghệ thiết bị hiện đại", desc: "Trang bị đầy đủ máy móc laser, thiết bị phẫu thuật nhập khẩu từ Mỹ, Hàn Quốc." },
                  { icon: <HeartPulse />, title: "An toàn là ưu tiên hàng đầu", desc: "Tuân thủ nghiêm ngặt quy trình vô khuẩn, kiểm tra sức khỏe toàn diện trước mọi thủ thuật." },
                  { icon: <Sparkles />, title: "Kết quả tự nhiên, lâu bền", desc: "Phương pháp tiếp cận tinh tế giúp kết quả hài hòa với đường nét khuôn mặt từng người." },
                ].map((w) => (
                  <WhyItem key={w.title}>
                    <WhyIcon>{w.icon}</WhyIcon>
                    <WhyBody>
                      <WhyItemTitle>{w.title}</WhyItemTitle>
                      <WhyItemDesc>{w.desc}</WhyItemDesc>
                    </WhyBody>
                  </WhyItem>
                ))}
              </WhyItems>
            </WhyRight>
          </WhyGrid>
        </Container>
      </Section>

      {/* ── Testimonials ── */}
      <Section $bg={t.colorBgNeutral}>
        <Container>
          <SectionLabel><Star /> Khách hàng nói gì</SectionLabel>
          <SectionTitle>Hơn 10,000 khách hàng<br />đã tin tưởng chúng tôi</SectionTitle>
          <TestimonialsGrid>
            {TESTIMONIALS.map((t) => (
              <TestiCard key={t.name}>
                <Stars>
                  {[...Array(5)].map((_, i) => <Star key={i} fill="currentColor" />)}
                </Stars>
                <TestiText>{'"'}{t.text}{'"'}</TestiText>
                <TestiAuthor>
                  <TestiAvatar $color={t.color}>{t.initials}</TestiAvatar>
                  <div>
                    <TestiName>{t.name}</TestiName>
                    <TestiSub>{t.sub}</TestiSub>
                  </div>
                </TestiAuthor>
              </TestiCard>
            ))}
          </TestimonialsGrid>
        </Container>
      </Section>

      {/* ── Blog ── */}
      <Section id="blog">
        <Container>
          <SectionLabel><Sparkles /> Bài viết & Kiến thức</SectionLabel>
          <SectionTitle>Tin tức & Chia sẻ<br />từ chuyên gia</SectionTitle>
          <SectionSub>Cập nhật kiến thức về thẩm mỹ, chăm sóc da và xu hướng làm đẹp mới nhất từ đội ngũ bác sĩ.</SectionSub>
          <BlogGrid>
            {BLOG_POSTS.map((p) => (
              <BlogCard key={p.title}>
                <BlogImg src={p.img} alt={p.title} />
                <BlogBody>
                  <BlogMeta>
                    <BlogTag>{p.tag}</BlogTag>
                    <BlogDate>{p.date}</BlogDate>
                  </BlogMeta>
                  <BlogTitle>{p.title}</BlogTitle>
                  <BlogExcerpt>{p.excerpt}</BlogExcerpt>
                  <BlogReadMore>Đọc thêm <ArrowRight /></BlogReadMore>
                </BlogBody>
              </BlogCard>
            ))}
          </BlogGrid>
        </Container>
      </Section>

      {/* ── CTA ── */}
      <CtaSection>
        <CtaGlow />
        <Container>
          <CtaContent>
            <SectionLabel style={{ justifyContent: "center", display: "flex", width: "100%", marginBottom: 16 }}>
              <MessageCircle /> Đặt lịch ngay hôm nay
            </SectionLabel>
            <CtaTitle>
              Bắt đầu hành trình<br />
              <span>làm đẹp của bạn</span>
            </CtaTitle>
            <CtaDesc>
              Tư vấn miễn phí với đội ngũ bác sĩ chuyên gia. Đặt lịch ngay qua AI chatbot 24/7.
            </CtaDesc>
            <CtaActions>
              <CtaBtnPrimary onClick={() => setChatOpen(true)}>
                <MessageCircle /> Chat & Đặt lịch ngay
              </CtaBtnPrimary>
              <CtaBtnSecondary>
                <Phone /> Gọi 0900 123 456
              </CtaBtnSecondary>
            </CtaActions>
          </CtaContent>
        </Container>
      </CtaSection>

      {/* ── Footer ── */}
      <FooterWrap id="contact">
        <Container>
          <FooterGrid>
            <FooterBrand>
              <FooterLogo>
                <FooterLogoIcon><Building2 /></FooterLogoIcon>
                <FooterLogoName>Phòng Khám</FooterLogoName>
              </FooterLogo>
              <FooterDesc>
                Phòng khám thẩm mỹ chuyên sâu với đội ngũ bác sĩ giàu kinh nghiệm. Chúng tôi cam kết mang đến vẻ đẹp tự nhiên và an toàn cho mỗi khách hàng.
              </FooterDesc>
              <SocialLinks>
                <SocialBtn href="#"><Share2 /></SocialBtn>
                <SocialBtn href="#"><Link2 /></SocialBtn>
                <SocialBtn href="#"><Play /></SocialBtn>
              </SocialLinks>
            </FooterBrand>

            <FooterCol>
              <FooterColTitle>Dịch vụ</FooterColTitle>
              <FooterLinks>
                <FooterLink>Tiêm Filler & Botox</FooterLink>
                <FooterLink>Cắt Mí Mắt</FooterLink>
                <FooterLink>Nâng Mũi Cao</FooterLink>
                <FooterLink>Laser Điều Trị</FooterLink>
                <FooterLink>Trẻ Hóa Da</FooterLink>
              </FooterLinks>
            </FooterCol>

            <FooterCol>
              <FooterColTitle>Thông tin</FooterColTitle>
              <FooterLinks>
                <FooterLink>Về chúng tôi</FooterLink>
                <FooterLink>Đội ngũ bác sĩ</FooterLink>
                <FooterLink>Bài viết & Blog</FooterLink>
                <FooterLink>Chính sách bảo mật</FooterLink>
                <FooterLink>Điều khoản dịch vụ</FooterLink>
              </FooterLinks>
            </FooterCol>

            <FooterCol>
              <FooterColTitle>Liên hệ</FooterColTitle>
              <FooterContact>
                <FooterContactItem><Phone /> 0900 123 456</FooterContactItem>
                <FooterContactItem><MapPin /> 123 Nguyễn Huệ, Q.1, TP.HCM</FooterContactItem>
                <FooterContactItem><Clock /> Thứ 2 – Thứ 7: 8:00 – 20:00</FooterContactItem>
              </FooterContact>
            </FooterCol>
          </FooterGrid>

          <FooterDivider>
            <FooterCopy>© 2026 Phòng Khám Thẩm Mỹ. Mọi quyền được bảo lưu.</FooterCopy>
            <FooterCopy>Thiết kế bởi đội ngũ công nghệ nội bộ.</FooterCopy>
          </FooterDivider>
        </Container>
      </FooterWrap>

      {/* ── Chat Widget ── */}
      {!chatOpen && <ChatRipple />}
      <ChatFab $open={chatOpen} onClick={() => setChatOpen((o) => !o)}>
        {chatOpen ? <X /> : <MessageCircle />}
      </ChatFab>

      <ChatPanel $open={chatOpen}>
        <ChatPanelHeader>
          <ChatBotAvatar><Bot /></ChatBotAvatar>
          <ChatBotInfo>
            <ChatBotName>Trợ lý AI Phòng Khám</ChatBotName>
            <ChatBotStatus>Sẵn sàng tư vấn</ChatBotStatus>
          </ChatBotInfo>
          <ChatCloseBtn onClick={() => setChatOpen(false)}><X /></ChatCloseBtn>
        </ChatPanelHeader>

        <ChatMessages>
          {messages.map((msg, i) => (
            <MsgRow key={i} $isUser={msg.role === "user"}>
              <MsgAvatar $isUser={msg.role === "user"}>
                {msg.role === "user" ? <User /> : <Bot />}
              </MsgAvatar>
              <MsgBubble $isUser={msg.role === "user"}>{msg.content}</MsgBubble>
            </MsgRow>
          ))}
          {loading && (
            <MsgRow $isUser={false}>
              <MsgAvatar $isUser={false}><Bot /></MsgAvatar>
              <TypingDots><Dot $i={0} /><Dot $i={1} /><Dot $i={2} /></TypingDots>
            </MsgRow>
          )}
          <div ref={bottomRef} />
        </ChatMessages>

        {showQuickReplies && (
          <ChatQuickReplies>
            {QUICK_REPLIES.map((q) => (
              <QuickBtn key={q} onClick={() => send(q)}>{q}</QuickBtn>
            ))}
          </ChatQuickReplies>
        )}

        <ChatInputBar>
          <ChatInput
            ref={textareaRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); autoResize(); }}
            onKeyDown={handleKey}
            placeholder="Nhập tin nhắn... (Enter để gửi)"
            rows={1}
          />
          <ChatSendBtn $active={!!input.trim() && !loading} onClick={() => send(input)}>
            <Send />
          </ChatSendBtn>
        </ChatInputBar>
      </ChatPanel>
    </Page>
  );
}
