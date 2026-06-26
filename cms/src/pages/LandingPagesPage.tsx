import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FormOutlined,
  InsertRowAboveOutlined,
  PictureOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Collapse,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Col,
  Select,
  Space,
  Switch,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api'
import type { LandingBlock, LandingBlockType, LandingFormField, LandingPage } from '../models'
import { LandingThemeEditor } from './LandingThemePage'

const LANDING_URL = import.meta.env.VITE_LANDING_URL || 'http://localhost:3001'

const blockTypeOptions: Array<{ value: LandingBlockType; label: string }> = [
  { value: 'title', label: 'Title' },
  { value: 'text', label: 'Text' },
  { value: 'image', label: 'Hình ảnh' },
  { value: 'video', label: 'Video' },
  { value: 'form', label: 'Form custom' },
]

const blockTypeIcons: Record<LandingBlockType, React.ReactNode> = {
  title: <FormOutlined />,
  text: <FormOutlined />,
  image: <PictureOutlined />,
  video: <VideoCameraOutlined />,
  form: <InsertRowAboveOutlined />,
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function normalizePath(value: string) {
  if (!value.trim()) return '/'
  const next = value.startsWith('/') ? value : `/${value}`
  return next === '/' ? next : next.replace(/\/+$/g, '')
}

function createField(): LandingFormField {
  return {
    id: crypto.randomUUID(),
    name: 'full_name',
    label: 'Họ tên',
    type: 'text',
    placeholder: '',
    required: true,
    span: 12,
  }
}

function createBlock(type: LandingBlockType): LandingBlock {
  const base: LandingBlock = {
    id: crypto.randomUUID(),
    type,
    row: 1,
    span: 12,
    order: 1,
  }

  if (type === 'title') {
    return { ...base, title: 'Tiêu đề mới', level: 2, align: 'left' }
  }

  if (type === 'text') {
    return { ...base, text: 'Mô tả nội dung block', align: 'left' }
  }

  if (type === 'image') {
    return { ...base, url: '', alt: '', caption: '' }
  }

  if (type === 'video') {
    return { ...base, url: '', title: '' }
  }

  return {
    ...base,
    title: 'Form đăng ký',
    description: '',
    submitLabel: 'Gửi thông tin',
    successMessage: 'Đã gửi thành công',
    fields: [createField()],
  }
}

function emptyPage(): Omit<LandingPage, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    slug: '',
    path: '/',
    title: '',
    description: '',
    seoTitle: '',
    seoDescription: '',
    blocks: [],
    isPublished: false,
  }
}

type PageTemplate = {
  key: string
  label: string
  category: string
  description: string
  blockSummary: string[]
  page: Omit<LandingPage, 'id' | 'createdAt' | 'updatedAt'>
}

function makeId() {
  return crypto.randomUUID()
}

const CONTACT_FORM_FIELDS = () => [
  { id: makeId(), name: 'full_name', label: 'Họ và tên', type: 'text' as const, placeholder: 'Nguyễn Thị A', required: true, span: 6 },
  { id: makeId(), name: 'phone', label: 'Số điện thoại', type: 'tel' as const, placeholder: '0901 234 567', required: true, span: 6 },
  { id: makeId(), name: 'service', label: 'Dịch vụ quan tâm', type: 'text' as const, placeholder: 'Ví dụ: nâng mũi, căng da mặt...', required: false, span: 12 },
]

const PAGE_TEMPLATES: PageTemplate[] = [
  // ─── Khởi đầu ─────────────────────────────────────
  {
    key: 'blank',
    label: 'Trang trống',
    category: 'Khởi đầu',
    description: 'Bắt đầu từ đầu, không có block nào.',
    blockSummary: [],
    page: emptyPage(),
  },

  // ─── Trang chính ───────────────────────────────────
  {
    key: 'home',
    label: 'Trang chủ (Home)',
    category: 'Trang chính',
    description: 'Hero, dịch vụ nổi bật, số liệu thành tích, hình ảnh và form tư vấn.',
    blockSummary: ['Hero title', 'Giới thiệu', 'Ảnh clinic', 'Dịch vụ nổi bật ×3', 'Số liệu ×4', 'Form tư vấn'],
    page: {
      slug: 'trang-chu',
      path: '/',
      title: 'Thiện Chánh Clinic – Thẩm mỹ chuyên nghiệp',
      description: 'Thiện Chánh Clinic – Nơi hội tụ đội ngũ bác sĩ chuyên sâu, công nghệ hiện đại và không gian sang trọng.',
      seoTitle: 'Thiện Chánh Clinic – Phòng khám thẩm mỹ uy tín',
      seoDescription: 'Thiện Chánh Clinic cung cấp các dịch vụ thẩm mỹ cao cấp: nâng mũi, độn cằm, căng da mặt... Bác sĩ giàu kinh nghiệm, an toàn, tự nhiên.',
      isPublished: false,
      blocks: [
        { id: makeId(), type: 'title', row: 1, span: 12, order: 1, title: 'Vẻ đẹp tự nhiên – Sự tự tin vượt trội', level: 1, align: 'center' },
        { id: makeId(), type: 'text', row: 2, span: 7, order: 2, text: 'Thiện Chánh Clinic – Phòng khám thẩm mỹ uy tín hàng đầu tại TP.HCM. Đội ngũ bác sĩ 10+ năm kinh nghiệm, công nghệ châu Âu, không gian 5 sao. Chúng tôi đồng hành cùng bạn trên hành trình tìm lại vẻ đẹp tự nhiên nhất.', align: 'left' },
        { id: makeId(), type: 'image', row: 2, span: 5, order: 3, url: '', alt: 'Thiện Chánh Clinic', caption: 'Cơ sở Thiện Chánh Clinic – Quận 1, TP.HCM' },
        { id: makeId(), type: 'title', row: 3, span: 12, order: 4, title: 'Dịch vụ nổi bật', level: 2, align: 'center' },
        { id: makeId(), type: 'text', row: 4, span: 4, order: 5, text: '👃 Nâng mũi cấu trúc\nSụn tự thân, dáng mũi tự nhiên – bền vững theo thời gian. Không lo co rút, không lo biến chứng.', align: 'left' },
        { id: makeId(), type: 'text', row: 4, span: 4, order: 6, text: '✨ Căng da mặt\nCông nghệ HIFU và chỉ treo Collagen V-Line – trẻ hóa làn da không cần phẫu thuật.', align: 'left' },
        { id: makeId(), type: 'text', row: 4, span: 4, order: 7, text: '💎 Độn cằm V-Line\nTạo đường cằm thanh tú, khuôn mặt cân đối hài hòa. Phẫu thuật nhanh – nghỉ dưỡng 3 ngày.', align: 'left' },
        { id: makeId(), type: 'title', row: 5, span: 12, order: 8, title: 'Vì sao hơn 10.000 khách hàng tin tưởng?', level: 2, align: 'center' },
        { id: makeId(), type: 'text', row: 6, span: 3, order: 9, text: '🏥 10+ năm\nHoạt động trong ngành thẩm mỹ y tế', align: 'center' },
        { id: makeId(), type: 'text', row: 6, span: 3, order: 10, text: '👨‍⚕️ 15 bác sĩ\nChuyên môn cao, đào tạo tại Hàn Quốc & Mỹ', align: 'center' },
        { id: makeId(), type: 'text', row: 6, span: 3, order: 11, text: '⭐ 4.9/5\nĐánh giá trung bình từ khách hàng thực tế', align: 'center' },
        { id: makeId(), type: 'text', row: 6, span: 3, order: 12, text: '🛡️ Bảo hành\nCam kết theo dõi và hỗ trợ trọn đời sau dịch vụ', align: 'center' },
        { id: makeId(), type: 'title', row: 7, span: 12, order: 13, title: 'Kết quả thực tế', level: 2, align: 'center' },
        { id: makeId(), type: 'image', row: 8, span: 4, order: 14, url: '', alt: 'Kết quả nâng mũi', caption: 'Kết quả nâng mũi cấu trúc – 3 tháng sau' },
        { id: makeId(), type: 'image', row: 8, span: 4, order: 15, url: '', alt: 'Kết quả căng da', caption: 'Kết quả căng da HIFU – 1 tháng sau' },
        { id: makeId(), type: 'image', row: 8, span: 4, order: 16, url: '', alt: 'Kết quả độn cằm', caption: 'Kết quả độn cằm V-Line – 2 tháng sau' },
        {
          id: makeId(), type: 'form', row: 9, span: 12, order: 17,
          title: 'Nhận tư vấn miễn phí ngay hôm nay',
          description: 'Để lại thông tin, chuyên viên sẽ liên hệ tư vấn trong 30 phút (miễn phí, không ràng buộc).',
          submitLabel: 'Nhận tư vấn miễn phí',
          successMessage: 'Cảm ơn bạn! Chuyên viên sẽ gọi lại trong 30 phút.',
          fields: CONTACT_FORM_FIELDS(),
        },
      ],
    },
  },
  {
    key: 'about',
    label: 'Giới thiệu phòng khám',
    category: 'Trang chính',
    description: 'Lịch sử, sứ mệnh, đội ngũ lãnh đạo, cơ sở vật chất và chứng nhận.',
    blockSummary: ['Tiêu đề', 'Câu chuyện thương hiệu', 'Ảnh clinic', 'Sứ mệnh & tầm nhìn ×3', 'Cơ sở vật chất ×3', 'Chứng nhận & giải thưởng'],
    page: {
      slug: 'gioi-thieu',
      path: '/gioi-thieu',
      title: 'Giới thiệu Thiện Chánh Clinic',
      description: 'Hơn 10 năm xây dựng và phát triển, Thiện Chánh Clinic tự hào là địa chỉ thẩm mỹ uy tín được hàng chục nghìn khách hàng tin tưởng.',
      seoTitle: 'Về Thiện Chánh Clinic – Phòng khám thẩm mỹ uy tín',
      seoDescription: 'Thiện Chánh Clinic: hơn 10 năm kinh nghiệm, 15+ bác sĩ chuyên khoa, được đào tạo quốc tế. Cam kết an toàn, tự nhiên và bền vững.',
      isPublished: false,
      blocks: [
        { id: makeId(), type: 'title', row: 1, span: 12, order: 1, title: 'Câu chuyện của Thiện Chánh Clinic', level: 1, align: 'center' },
        { id: makeId(), type: 'text', row: 2, span: 7, order: 2, text: 'Được thành lập năm 2014 bởi BS. Nguyễn Thiện Chánh – người tiên phong trong phẫu thuật thẩm mỹ cấu trúc tại Việt Nam – Thiện Chánh Clinic ra đời với một triết lý duy nhất: vẻ đẹp phải từ bên trong, tự nhiên và bền vững.\n\nTrải qua hơn 10 năm, chúng tôi đã phục vụ hơn 10.000 khách hàng với tỷ lệ hài lòng 97%. Mỗi ca điều trị là một hành trình cá nhân hóa – không có công thức chung cho vẻ đẹp.', align: 'left' },
        { id: makeId(), type: 'image', row: 2, span: 5, order: 3, url: '', alt: 'Cơ sở Thiện Chánh Clinic', caption: 'Cơ sở chính tại Quận 1, TP.HCM' },
        { id: makeId(), type: 'title', row: 3, span: 12, order: 4, title: 'Sứ mệnh & Tầm nhìn', level: 2, align: 'center' },
        { id: makeId(), type: 'text', row: 4, span: 4, order: 5, text: '🎯 Sứ mệnh\nĐồng hành cùng mỗi khách hàng tìm lại vẻ đẹp tự nhiên và sự tự tin thực sự – không phải vẻ đẹp khuôn mẫu.', align: 'left' },
        { id: makeId(), type: 'text', row: 4, span: 4, order: 6, text: '👁️ Tầm nhìn\nTrở thành trung tâm thẩm mỹ y tế hàng đầu Đông Nam Á, dẫn đầu về công nghệ và đạo đức nghề nghiệp.', align: 'left' },
        { id: makeId(), type: 'text', row: 4, span: 4, order: 7, text: '💡 Giá trị cốt lõi\nAn toàn – Tự nhiên – Cá nhân hóa – Bền vững – Tận tâm là 5 giá trị định hướng mọi quyết định của chúng tôi.', align: 'left' },
        { id: makeId(), type: 'title', row: 5, span: 12, order: 8, title: 'Cơ sở vật chất & Công nghệ', level: 2, align: 'center' },
        { id: makeId(), type: 'image', row: 6, span: 4, order: 9, url: '', alt: 'Phòng phẫu thuật', caption: 'Phòng phẫu thuật đạt chuẩn Bộ Y tế' },
        { id: makeId(), type: 'image', row: 6, span: 4, order: 10, url: '', alt: 'Phòng tư vấn', caption: 'Phòng tư vấn riêng tư, sang trọng' },
        { id: makeId(), type: 'image', row: 6, span: 4, order: 11, url: '', alt: 'Thiết bị y tế', caption: 'Thiết bị HIFU, laser nhập khẩu châu Âu' },
        { id: makeId(), type: 'title', row: 7, span: 12, order: 12, title: 'Chứng nhận & Giải thưởng', level: 2, align: 'center' },
        { id: makeId(), type: 'text', row: 8, span: 3, order: 13, text: '🏆 Top 10\nPhòng khám thẩm mỹ uy tín TP.HCM 2023', align: 'center' },
        { id: makeId(), type: 'text', row: 8, span: 3, order: 14, text: '🇰🇷 Chứng nhận Hàn Quốc\nĐào tạo và cấp phép bởi KSIPS 2022', align: 'center' },
        { id: makeId(), type: 'text', row: 8, span: 3, order: 15, text: '🏥 ISO 9001:2015\nHệ thống quản lý chất lượng quốc tế', align: 'center' },
        { id: makeId(), type: 'text', row: 8, span: 3, order: 16, text: '⭐ Best Clinic\nGiải thưởng "Phòng khám xuất sắc" 2023', align: 'center' },
      ],
    },
  },
  {
    key: 'team',
    label: 'Đội ngũ bác sĩ',
    category: 'Trang chính',
    description: 'Giới thiệu từng bác sĩ: ảnh, chuyên môn, kinh nghiệm và form đặt lịch với bác sĩ.',
    blockSummary: ['Tiêu đề', 'Mô tả đội ngũ', 'Bác sĩ ×4 (ảnh + mô tả)', 'Form đặt lịch'],
    page: {
      slug: 'doi-ngu-bac-si',
      path: '/doi-ngu-bac-si',
      title: 'Đội ngũ bác sĩ Thiện Chánh Clinic',
      description: 'Gặp gỡ đội ngũ bác sĩ chuyên khoa giàu kinh nghiệm, được đào tạo tại Hàn Quốc, Mỹ và châu Âu.',
      seoTitle: 'Đội ngũ bác sĩ – Thiện Chánh Clinic',
      seoDescription: 'Đội ngũ 15+ bác sĩ chuyên khoa thẩm mỹ tại Thiện Chánh Clinic. Được đào tạo quốc tế, kinh nghiệm 10+ năm.',
      isPublished: false,
      blocks: [
        { id: makeId(), type: 'title', row: 1, span: 12, order: 1, title: 'Đội ngũ chuyên gia hàng đầu', level: 1, align: 'center' },
        { id: makeId(), type: 'text', row: 2, span: 12, order: 2, text: 'Mỗi bác sĩ tại Thiện Chánh Clinic đều trải qua quá trình đào tạo nghiêm ngặt tại các cơ sở y tế hàng đầu trong và ngoài nước. Chúng tôi tin rằng vẻ đẹp cần được tạo ra bởi bàn tay của những người hiểu sâu về giải phẫu, thẩm mỹ và tâm lý khách hàng.', align: 'center' },
        { id: makeId(), type: 'title', row: 3, span: 12, order: 3, title: 'Gặp gỡ các chuyên gia', level: 2, align: 'center' },
        { id: makeId(), type: 'image', row: 4, span: 3, order: 4, url: '', alt: 'BS. Nguyễn Thiện Chánh', caption: 'BS. Nguyễn Thiện Chánh – Giám đốc y khoa, 15 năm kinh nghiệm' },
        { id: makeId(), type: 'image', row: 4, span: 3, order: 5, url: '', alt: 'BS. Trần Minh Thư', caption: 'BS. Trần Minh Thư – Chuyên khoa da liễu thẩm mỹ' },
        { id: makeId(), type: 'image', row: 4, span: 3, order: 6, url: '', alt: 'BS. Lê Hoàng Nam', caption: 'BS. Lê Hoàng Nam – Phẫu thuật thẩm mỹ mặt' },
        { id: makeId(), type: 'image', row: 4, span: 3, order: 7, url: '', alt: 'BS. Phạm Thị Lan', caption: 'BS. Phạm Thị Lan – Tiêm filler & Botox chuyên sâu' },
        { id: makeId(), type: 'text', row: 5, span: 3, order: 8, text: '🎓 Đại học Y Dược TP.HCM\n🇰🇷 Chứng chỉ KSIPS Hàn Quốc\n🏆 Giải thưởng bác sĩ xuất sắc 2022\n📌 Chuyên: Nâng mũi, độn cằm', align: 'left' },
        { id: makeId(), type: 'text', row: 5, span: 3, order: 9, text: '🎓 Đại học Y Hà Nội\n🇫🇷 Tu nghiệp tại Paris, Pháp\n💆 Chuyên: HIFU, laser, điều trị da\n📌 Kinh nghiệm: 8 năm', align: 'left' },
        { id: makeId(), type: 'text', row: 5, span: 3, order: 10, text: '🎓 Đại học Y Dược Cần Thơ\n🇺🇸 Đào tạo tại Mayo Clinic, Mỹ\n💡 Chuyên: cắt mí, nâng cung mày\n📌 Kinh nghiệm: 10 năm', align: 'left' },
        { id: makeId(), type: 'text', row: 5, span: 3, order: 11, text: '🎓 Đại học Y Dược TP.HCM\n🇰🇷 Chứng chỉ Allergan Master\n✨ Chuyên: Filler, Botox, trẻ hóa\n📌 Kinh nghiệm: 7 năm', align: 'left' },
        {
          id: makeId(), type: 'form', row: 6, span: 12, order: 12,
          title: 'Đặt lịch tư vấn với bác sĩ',
          description: 'Chọn bác sĩ bạn muốn gặp và thời gian phù hợp. Chúng tôi sẽ xác nhận lịch hẹn trong vòng 30 phút.',
          submitLabel: 'Đặt lịch tư vấn',
          successMessage: 'Yêu cầu đã gửi! Chúng tôi sẽ liên hệ xác nhận sớm nhất.',
          fields: [
            { id: makeId(), name: 'full_name', label: 'Họ và tên', type: 'text' as const, placeholder: 'Nguyễn Văn A', required: true, span: 6 },
            { id: makeId(), name: 'phone', label: 'Số điện thoại', type: 'tel' as const, placeholder: '0901 234 567', required: true, span: 6 },
            { id: makeId(), name: 'doctor', label: 'Bác sĩ mong muốn', type: 'text' as const, placeholder: 'Ví dụ: BS. Nguyễn Thiện Chánh', required: false, span: 6 },
            { id: makeId(), name: 'preferred_time', label: 'Thời gian mong muốn', type: 'text' as const, placeholder: 'Ví dụ: chiều thứ 4', required: false, span: 6 },
          ],
        },
      ],
    },
  },
  {
    key: 'contact',
    label: 'Liên hệ',
    category: 'Trang chính',
    description: 'Thông tin địa chỉ, giờ mở cửa, hotline và form liên hệ.',
    blockSummary: ['Tiêu đề', 'Thông tin liên hệ', 'Giờ làm việc', 'Form liên hệ'],
    page: {
      slug: 'lien-he',
      path: '/lien-he',
      title: 'Liên hệ Thiện Chánh Clinic',
      description: 'Liên hệ với chúng tôi để được tư vấn miễn phí và đặt lịch hẹn.',
      seoTitle: 'Liên hệ – Thiện Chánh Clinic',
      seoDescription: 'Liên hệ Thiện Chánh Clinic để được tư vấn thẩm mỹ miễn phí. Hotline: 1800 1234. Địa chỉ: Quận 1, TP.HCM.',
      isPublished: false,
      blocks: [
        { id: makeId(), type: 'title', row: 1, span: 12, order: 1, title: 'Chúng tôi luôn sẵn sàng lắng nghe bạn', level: 1, align: 'center' },
        { id: makeId(), type: 'text', row: 2, span: 4, order: 2, text: '📍 Cơ sở 1 – Quận 1\n123 Đường Nguyễn Trãi, P. Bến Thành\nQ.1, TP.HCM\n\n📍 Cơ sở 2 – Quận 7\n456 Đường Nguyễn Hữu Thọ, P. Tân Phong\nQ.7, TP.HCM', align: 'left' },
        { id: makeId(), type: 'text', row: 2, span: 4, order: 3, text: '📞 Hotline: 1800 1234 (miễn phí)\n📱 Zalo: 0901 234 567\n📧 Email: info@thienchanh.clinic\n🌐 Website: thienchanh.clinic\n\n💬 Fanpage: fb.com/ThienChanhClinic', align: 'left' },
        { id: makeId(), type: 'text', row: 2, span: 4, order: 4, text: '⏰ Giờ làm việc\n\nThứ 2 – Thứ 6: 8:00 – 20:00\nThứ 7: 8:00 – 18:00\nChủ nhật: 9:00 – 17:00\n\n🎄 Không nghỉ lễ Tết (trừ mùng 1 Tết)', align: 'left' },
        {
          id: makeId(), type: 'form', row: 3, span: 12, order: 5,
          title: 'Gửi yêu cầu tư vấn',
          description: 'Để lại thông tin, chuyên viên sẽ liên hệ lại trong vòng 30 phút trong giờ làm việc.',
          submitLabel: 'Gửi yêu cầu',
          successMessage: 'Đã nhận yêu cầu! Chúng tôi sẽ liên hệ bạn sớm nhất.',
          fields: [
            { id: makeId(), name: 'full_name', label: 'Họ và tên', type: 'text' as const, placeholder: 'Nguyễn Thị A', required: true, span: 6 },
            { id: makeId(), name: 'phone', label: 'Số điện thoại', type: 'tel' as const, placeholder: '0901 234 567', required: true, span: 6 },
            { id: makeId(), name: 'email', label: 'Email', type: 'email' as const, placeholder: 'email@example.com', required: false, span: 6 },
            { id: makeId(), name: 'branch', label: 'Cơ sở muốn đến', type: 'text' as const, placeholder: 'Quận 1 hoặc Quận 7', required: false, span: 6 },
            { id: makeId(), name: 'message', label: 'Nội dung', type: 'textarea' as const, placeholder: 'Bạn muốn hỏi về dịch vụ nào?', required: false, span: 12 },
          ],
        },
      ],
    },
  },
  {
    key: 'dat-lich',
    label: 'Đặt lịch khám',
    category: 'Trang chính',
    description: 'Thông tin phòng khám + form đặt lịch đầy đủ gồm dịch vụ, bác sĩ và thời gian.',
    blockSummary: ['Tiêu đề', 'Thông tin clinic', 'Form đặt lịch chi tiết'],
    page: {
      slug: 'dat-lich-kham',
      path: '/dat-lich-kham',
      title: 'Đặt lịch khám tại Thiện Chánh Clinic',
      description: 'Đặt lịch khám và tư vấn thẩm mỹ trực tiếp với bác sĩ.',
      seoTitle: 'Đặt lịch khám – Thiện Chánh Clinic',
      seoDescription: 'Đặt lịch khám tư vấn thẩm mỹ miễn phí tại Thiện Chánh Clinic. Bác sĩ giàu kinh nghiệm, tận tâm.',
      isPublished: false,
      blocks: [
        { id: makeId(), type: 'title', row: 1, span: 12, order: 1, title: 'Đặt lịch khám & tư vấn miễn phí', level: 1, align: 'center' },
        { id: makeId(), type: 'text', row: 1, span: 12, order: 2, text: 'Buổi tư vấn hoàn toàn miễn phí – không ràng buộc. Bác sĩ sẽ lắng nghe mong muốn của bạn và đưa ra phác đồ phù hợp nhất.', align: 'center' },
        { id: makeId(), type: 'text', row: 2, span: 5, order: 3, text: '📍 Địa chỉ:\nCơ sở 1: 123 Nguyễn Trãi, Q.1\nCơ sở 2: 456 Nguyễn Hữu Thọ, Q.7\n\n⏰ Giờ làm việc:\nT2–T6: 8:00 – 20:00\nT7–CN: 8:00 – 17:00\n\n📞 Hotline: 1800 1234 (miễn phí)', align: 'left' },
        {
          id: makeId(), type: 'form', row: 2, span: 7, order: 4,
          title: 'Chọn thời gian phù hợp',
          description: 'Chúng tôi sẽ xác nhận lịch hẹn qua điện thoại trong vòng 1 giờ.',
          submitLabel: 'Đặt lịch ngay',
          successMessage: 'Đặt lịch thành công! Chúng tôi sẽ gọi xác nhận sớm.',
          fields: [
            { id: makeId(), name: 'full_name', label: 'Họ và tên', type: 'text' as const, placeholder: 'Nguyễn Văn C', required: true, span: 12 },
            { id: makeId(), name: 'phone', label: 'Số điện thoại', type: 'tel' as const, placeholder: '0901 234 567', required: true, span: 12 },
            { id: makeId(), name: 'service', label: 'Dịch vụ muốn tư vấn', type: 'text' as const, placeholder: 'Ví dụ: nâng mũi, căng da mặt...', required: false, span: 12 },
            { id: makeId(), name: 'branch', label: 'Cơ sở', type: 'text' as const, placeholder: 'Quận 1 hoặc Quận 7', required: false, span: 6 },
            { id: makeId(), name: 'preferred_time', label: 'Thời gian mong muốn', type: 'text' as const, placeholder: 'Ví dụ: sáng thứ 3', required: false, span: 6 },
          ],
        },
      ],
    },
  },
  {
    key: 'before-after',
    label: 'Kết quả thực tế (Before/After)',
    category: 'Trang chính',
    description: 'Gallery kết quả trước/sau theo từng dịch vụ, kèm testimonials và form.',
    blockSummary: ['Tiêu đề', 'Nâng mũi B/A ×3', 'Căng da B/A ×3', 'Testimonials ×3', 'Form tư vấn'],
    page: {
      slug: 'ket-qua-thuc-te',
      path: '/ket-qua-thuc-te',
      title: 'Kết quả thực tế – Thiện Chánh Clinic',
      description: 'Hàng ngàn ca thành công. Xem kết quả trước và sau điều trị từ khách hàng thực tế.',
      seoTitle: 'Kết quả thực tế trước & sau – Thiện Chánh Clinic',
      seoDescription: 'Kết quả nâng mũi, căng da, độn cằm thực tế tại Thiện Chánh Clinic. 10.000+ ca thành công, 97% hài lòng.',
      isPublished: false,
      blocks: [
        { id: makeId(), type: 'title', row: 1, span: 12, order: 1, title: 'Kết quả nói thay mọi lời', level: 1, align: 'center' },
        { id: makeId(), type: 'text', row: 2, span: 12, order: 2, text: 'Hơn 10.000 khách hàng đã tin tưởng chúng tôi. Dưới đây là một phần kết quả thực tế từ những người thật, câu chuyện thật.', align: 'center' },
        { id: makeId(), type: 'title', row: 3, span: 12, order: 3, title: 'Nâng mũi cấu trúc', level: 2, align: 'left' },
        { id: makeId(), type: 'image', row: 4, span: 4, order: 4, url: '', alt: 'Nâng mũi trước sau 1', caption: 'Chị Ngọc – Nâng mũi sụn tự thân, 3 tháng sau' },
        { id: makeId(), type: 'image', row: 4, span: 4, order: 5, url: '', alt: 'Nâng mũi trước sau 2', caption: 'Chị Hương – Nâng mũi kết hợp chỉnh vách ngăn' },
        { id: makeId(), type: 'image', row: 4, span: 4, order: 6, url: '', alt: 'Nâng mũi trước sau 3', caption: 'Chị Mai – Nâng mũi L-shape, 2 tháng sau' },
        { id: makeId(), type: 'title', row: 5, span: 12, order: 7, title: 'Căng da & Trẻ hóa', level: 2, align: 'left' },
        { id: makeId(), type: 'image', row: 6, span: 4, order: 8, url: '', alt: 'Căng da trước sau 1', caption: 'Chị Lan – HIFU kết hợp chỉ Collagen, 6 tuần sau' },
        { id: makeId(), type: 'image', row: 6, span: 4, order: 9, url: '', alt: 'Căng da trước sau 2', caption: 'Chị Thu – Căng da toàn mặt không phẫu thuật' },
        { id: makeId(), type: 'image', row: 6, span: 4, order: 10, url: '', alt: 'Căng da trước sau 3', caption: 'Chị Nhung – Xóa nếp nhăn bằng Botox' },
        { id: makeId(), type: 'title', row: 7, span: 12, order: 11, title: 'Khách hàng nói gì về chúng tôi', level: 2, align: 'center' },
        { id: makeId(), type: 'text', row: 8, span: 4, order: 12, text: '"Tôi đã đến nhiều nơi nhưng Thiện Chánh Clinic là nơi đầu tiên khiến tôi cảm thấy thực sự được lắng nghe. Kết quả nâng mũi vượt ngoài mong đợi."\n\n⭐⭐⭐⭐⭐ – Chị Ngọc Anh, 28 tuổi', align: 'left' },
        { id: makeId(), type: 'text', row: 8, span: 4, order: 13, text: '"Sau 2 lần điều trị HIFU, da mặt tôi săn chắc hơn hẳn. Bác sĩ tư vấn rất tận tâm, không ép mua gói dịch vụ."\n\n⭐⭐⭐⭐⭐ – Chị Thu Hà, 42 tuổi', align: 'left' },
        { id: makeId(), type: 'text', row: 8, span: 4, order: 14, text: '"Ca độn cằm của tôi được thực hiện bởi BS. Chánh – rất chuyên nghiệp. Hồi phục nhanh, kết quả tự nhiên đến mức bạn bè không nhận ra."\n\n⭐⭐⭐⭐⭐ – Chị Minh Tú, 31 tuổi', align: 'left' },
        {
          id: makeId(), type: 'form', row: 9, span: 12, order: 15,
          title: 'Bạn muốn có kết quả như vậy?',
          description: 'Để lại thông tin để được tư vấn miễn phí và xem thêm kết quả phù hợp với nhu cầu của bạn.',
          submitLabel: 'Tôi muốn tư vấn miễn phí',
          successMessage: 'Tuyệt vời! Chuyên viên sẽ liên hệ bạn trong 30 phút.',
          fields: CONTACT_FORM_FIELDS(),
        },
      ],
    },
  },

  // ─── Dịch vụ cụ thể ────────────────────────────────
  {
    key: 'nang-mui',
    label: 'Nâng mũi cấu trúc',
    category: 'Dịch vụ',
    description: 'Landing page dịch vụ nâng mũi: kỹ thuật, lợi ích, video quy trình và form.',
    blockSummary: ['Hero title', 'Mô tả dịch vụ', 'Video quy trình', 'Lợi ích ×3', 'Q&A ×4', 'Form tư vấn'],
    page: {
      slug: 'dich-vu-nang-mui',
      path: '/dich-vu-nang-mui',
      title: 'Nâng mũi cấu trúc sụn tự thân',
      description: 'Nâng mũi cấu trúc sụn tự thân – giải pháp tự nhiên, bền vững cho dáng mũi hoàn hảo.',
      seoTitle: 'Nâng mũi cấu trúc – Thiện Chánh Clinic',
      seoDescription: 'Nâng mũi sụn tự thân an toàn, tự nhiên tại Thiện Chánh Clinic. Kết quả bền vững, không lo biến chứng.',
      isPublished: false,
      blocks: [
        { id: makeId(), type: 'title', row: 1, span: 12, order: 1, title: 'Nâng mũi cấu trúc sụn tự thân', level: 1, align: 'center' },
        { id: makeId(), type: 'text', row: 2, span: 7, order: 2, text: 'Kỹ thuật nâng mũi cấu trúc sụn tự thân là giải pháp tối ưu cho dáng mũi tự nhiên, bền lâu. Bác sĩ sử dụng sụn tai hoặc sụn sườn của chính bệnh nhân để tạo hình mũi – không lo thải trừ, không lo biến chứng dài hạn.\n\nKỹ thuật này cho phép tạo hình mũi hoàn toàn cá nhân hóa: từ nâng sống mũi, thu nhỏ đầu mũi, chỉnh vách ngăn đến tạo góc mũi-môi phù hợp với khuôn mặt từng người.', align: 'left' },
        { id: makeId(), type: 'image', row: 2, span: 5, order: 3, url: '', alt: 'Kết quả nâng mũi', caption: 'Kết quả thực tế – 3 tháng sau nâng mũi sụn tự thân' },
        { id: makeId(), type: 'video', row: 3, span: 12, order: 4, url: '', title: 'Quy trình nâng mũi cấu trúc tại Thiện Chánh Clinic' },
        { id: makeId(), type: 'title', row: 4, span: 12, order: 5, title: 'Tại sao chọn sụn tự thân?', level: 2, align: 'left' },
        { id: makeId(), type: 'text', row: 5, span: 4, order: 6, text: '✅ Không thải trừ\nSụn từ cơ thể bạn → cơ thể không từ chối. Tỷ lệ biến chứng gần bằng 0 so với sụn nhân tạo.', align: 'left' },
        { id: makeId(), type: 'text', row: 5, span: 4, order: 7, text: '✅ Kết quả bền vững 20+ năm\nCấu trúc sụn tự thân tích hợp vào mô cơ thể, duy trì hình dạng theo thời gian mà không cần can thiệp lại.', align: 'left' },
        { id: makeId(), type: 'text', row: 5, span: 4, order: 8, text: '✅ Tùy chỉnh hoàn toàn\nBác sĩ điêu khắc sụn trực tiếp trong phòng mổ, phù hợp chính xác với cấu trúc mũi và khuôn mặt của bạn.', align: 'left' },
        { id: makeId(), type: 'title', row: 6, span: 12, order: 9, title: 'Câu hỏi thường gặp', level: 2, align: 'left' },
        { id: makeId(), type: 'text', row: 7, span: 6, order: 10, text: '❓ Phẫu thuật kéo dài bao lâu?\nKhoảng 2–3 giờ tùy độ phức tạp. Gây tê toàn thân để đảm bảo không đau trong suốt quá trình.', align: 'left' },
        { id: makeId(), type: 'text', row: 7, span: 6, order: 11, text: '❓ Thời gian hồi phục?\nSưng bầm giảm sau 7–10 ngày. Kết quả tự nhiên hoàn toàn sau 3 tháng.', align: 'left' },
        { id: makeId(), type: 'text', row: 8, span: 6, order: 12, text: '❓ Có đau không?\nTrong phẫu thuật không đau (gây mê). Sau phẫu thuật có ê nhẹ, giảm dần sau 3–5 ngày.', align: 'left' },
        { id: makeId(), type: 'text', row: 8, span: 6, order: 13, text: '❓ Chi phí bao nhiêu?\nChi phí dao động từ 25–60 triệu tùy kỹ thuật và độ phức tạp. Báo giá chính xác sau khi bác sĩ khám.', align: 'left' },
        {
          id: makeId(), type: 'form', row: 9, span: 12, order: 14,
          title: 'Tư vấn miễn phí – Không ràng buộc',
          description: 'Gặp bác sĩ trực tiếp để được đánh giá cấu trúc mũi và tư vấn phương pháp phù hợp nhất.',
          submitLabel: 'Đặt lịch tư vấn miễn phí',
          successMessage: 'Đã đặt lịch! Bác sĩ sẽ liên hệ bạn trong 30 phút.',
          fields: CONTACT_FORM_FIELDS(),
        },
      ],
    },
  },
  {
    key: 'cang-da',
    label: 'Căng da & Trẻ hóa',
    category: 'Dịch vụ',
    description: 'Landing page dịch vụ căng da không phẫu thuật: HIFU, chỉ collagen, laser.',
    blockSummary: ['Hero title', 'Mô tả', 'Phương pháp ×3', 'Phù hợp ai', 'Form tư vấn'],
    page: {
      slug: 'cang-da-tre-hoa',
      path: '/cang-da-tre-hoa',
      title: 'Căng da mặt & Trẻ hóa không phẫu thuật',
      description: 'Công nghệ HIFU, chỉ Collagen V-Line và laser thế hệ mới – trẻ hóa làn da không cần dao kéo.',
      seoTitle: 'Căng da mặt không phẫu thuật – Thiện Chánh Clinic',
      seoDescription: 'Căng da mặt HIFU, chỉ collagen tại Thiện Chánh Clinic. Không phẫu thuật, không thời gian nghỉ dưỡng, trẻ hóa 5–10 tuổi.',
      isPublished: false,
      blocks: [
        { id: makeId(), type: 'title', row: 1, span: 12, order: 1, title: 'Trẻ hơn 10 tuổi – Không dao kéo', level: 1, align: 'center' },
        { id: makeId(), type: 'text', row: 2, span: 12, order: 2, text: 'Với các công nghệ trẻ hóa phi phẫu thuật tiên tiến nhất hiện nay, Thiện Chánh Clinic giúp bạn sở hữu làn da săn chắc, tươi trẻ mà không cần trải qua ca mổ hay thời gian nghỉ dưỡng dài.', align: 'center' },
        { id: makeId(), type: 'title', row: 3, span: 12, order: 3, title: 'Các phương pháp chúng tôi áp dụng', level: 2, align: 'center' },
        { id: makeId(), type: 'image', row: 4, span: 4, order: 4, url: '', alt: 'HIFU', caption: 'HIFU Ultraformer III – Nâng cơ mặt bằng siêu âm hội tụ' },
        { id: makeId(), type: 'image', row: 4, span: 4, order: 5, url: '', alt: 'Chỉ Collagen', caption: 'Chỉ Collagen V-Line – Căng da, tạo đường viền V-shape' },
        { id: makeId(), type: 'image', row: 4, span: 4, order: 6, url: '', alt: 'Laser Fractional', caption: 'Laser Fractional CO2 – Tái tạo da, xóa nếp nhăn sâu' },
        { id: makeId(), type: 'text', row: 5, span: 4, order: 7, text: '🔊 HIFU Ultraformer III\nSiêu âm hội tụ tác động sâu đến lớp SMAS – cùng lớp mà bác sĩ phẫu thuật căng da cổ điển. Kết quả kéo dài 12–18 tháng. Không đau, không phục hồi.', align: 'left' },
        { id: makeId(), type: 'text', row: 5, span: 4, order: 8, text: '🧵 Chỉ Collagen V-Line\nChỉ tự tiêu tan theo thời gian, kích thích cơ thể sản sinh collagen tự nhiên. Nâng má, cằm, đường viền mặt tức thì – kết quả tự nhiên hoàn toàn.', align: 'left' },
        { id: makeId(), type: 'text', row: 5, span: 4, order: 9, text: '⚡ Laser CO2 Fractional\nNgàn chùm laser vi điểm tái tạo lớp da từ sâu. Xóa nếp nhăn, đốm nâu, lỗ chân lông to. Da mới mịn màng sau 5–7 ngày.', align: 'left' },
        { id: makeId(), type: 'title', row: 6, span: 12, order: 10, title: 'Phù hợp với ai?', level: 2, align: 'center' },
        { id: makeId(), type: 'text', row: 7, span: 3, order: 11, text: '✔ Da chảy xệ, mất đàn hồi', align: 'center' },
        { id: makeId(), type: 'text', row: 7, span: 3, order: 12, text: '✔ Nếp nhăn quanh mắt, miệng', align: 'center' },
        { id: makeId(), type: 'text', row: 7, span: 3, order: 13, text: '✔ Mặt bị vuông, thiếu V-line', align: 'center' },
        { id: makeId(), type: 'text', row: 7, span: 3, order: 14, text: '✔ Da thô ráp, lỗ chân lông to', align: 'center' },
        {
          id: makeId(), type: 'form', row: 8, span: 12, order: 15,
          title: 'Khám da miễn phí với chuyên gia',
          description: 'Bác sĩ sẽ đánh giá tình trạng da và đề xuất phác đồ phù hợp nhất với bạn.',
          submitLabel: 'Đặt lịch khám da miễn phí',
          successMessage: 'Tuyệt vời! Chúng tôi sẽ liên hệ xác nhận lịch hẹn.',
          fields: CONTACT_FORM_FIELDS(),
        },
      ],
    },
  },
  {
    key: 'don-cam',
    label: 'Độn cằm V-Line',
    category: 'Dịch vụ',
    description: 'Landing page độn cằm: giải phẫu thẩm mỹ cằm, phương pháp, kết quả và form.',
    blockSummary: ['Hero', 'Video', 'Phương pháp ×2', 'Quy trình 4 bước', 'Form tư vấn'],
    page: {
      slug: 'don-cam-v-line',
      path: '/don-cam-v-line',
      title: 'Độn cằm V-Line – Tạo khuôn mặt cân đối',
      description: 'Độn cằm tạo hình V-line thanh tú, cân đối toàn khuôn mặt. Phẫu thuật 45 phút, kết quả vĩnh viễn.',
      seoTitle: 'Độn cằm V-Line – Thiện Chánh Clinic',
      seoDescription: 'Phẫu thuật độn cằm V-Line tại Thiện Chánh Clinic. Cằm thanh, mặt cân đối – phẫu thuật 45 phút, tự nhiên bền vững.',
      isPublished: false,
      blocks: [
        { id: makeId(), type: 'title', row: 1, span: 12, order: 1, title: 'Độn cằm V-Line – Khuôn mặt hoàn hảo', level: 1, align: 'center' },
        { id: makeId(), type: 'text', row: 2, span: 7, order: 2, text: 'Cằm là điểm neo giữ sự cân bằng của toàn khuôn mặt. Một chiếc cằm ngắn, lùi hoặc rộng có thể khiến khuôn mặt mất cân đối dù các bộ phận khác hoàn hảo.\n\nPhẫu thuật độn cằm V-Line tại Thiện Chánh Clinic giúp tái tạo tỷ lệ vàng cho khuôn mặt – chỉ trong 45 phút phẫu thuật, thời gian phục hồi 3–5 ngày.', align: 'left' },
        { id: makeId(), type: 'image', row: 2, span: 5, order: 3, url: '', alt: 'Kết quả độn cằm', caption: 'Kết quả thực tế – 2 tháng sau độn cằm V-Line' },
        { id: makeId(), type: 'video', row: 3, span: 12, order: 4, url: '', title: 'Quy trình phẫu thuật độn cằm tại Thiện Chánh' },
        { id: makeId(), type: 'title', row: 4, span: 12, order: 5, title: 'Hai phương pháp chính', level: 2, align: 'center' },
        { id: makeId(), type: 'text', row: 5, span: 6, order: 6, text: '💉 Filler cằm (không phẫu thuật)\nDùng axit hyaluronic tạo hình cằm tức thì. Phù hợp cho người muốn cải thiện nhẹ, không muốn phẫu thuật. Kết quả 12–18 tháng, có thể điều chỉnh.', align: 'left' },
        { id: makeId(), type: 'text', row: 5, span: 6, order: 7, text: '🔪 Đặt implant cằm (phẫu thuật)\nSử dụng túi silicone y tế hoặc sụn tự thân để tạo hình cằm vĩnh viễn. Kết quả tự nhiên, không thay đổi theo thời gian. Vết mổ nhỏ trong miệng – không để lại sẹo.', align: 'left' },
        { id: makeId(), type: 'title', row: 6, span: 12, order: 8, title: 'Quy trình 4 bước', level: 2, align: 'center' },
        { id: makeId(), type: 'text', row: 7, span: 3, order: 9, text: '01\n──\nTư vấn & thiết kế\nBác sĩ phân tích khuôn mặt, thiết kế dáng cằm phù hợp và mô phỏng kết quả 3D.', align: 'center' },
        { id: makeId(), type: 'text', row: 7, span: 3, order: 10, text: '02\n──\nPhẫu thuật\n45–60 phút, gây tê tại chỗ hoặc mê nông. Bạn không cảm thấy đau trong suốt quá trình.', align: 'center' },
        { id: makeId(), type: 'text', row: 7, span: 3, order: 11, text: '03\n──\nHồi phục\nSưng nhẹ 3–5 ngày. Sau 7 ngày tháo chỉ, trở lại sinh hoạt bình thường.', align: 'center' },
        { id: makeId(), type: 'text', row: 7, span: 3, order: 12, text: '04\n──\nKết quả vĩnh viễn\nCằm định hình hoàn toàn sau 1–2 tháng. Tỷ lệ vàng khuôn mặt được tái tạo lâu dài.', align: 'center' },
        {
          id: makeId(), type: 'form', row: 8, span: 12, order: 13,
          title: 'Thiết kế khuôn mặt lý tưởng của bạn',
          description: 'Bác sĩ sẽ phân tích khuôn mặt và tư vấn dáng cằm phù hợp – hoàn toàn miễn phí.',
          submitLabel: 'Đặt lịch tư vấn miễn phí',
          successMessage: 'Đã nhận! Bác sĩ sẽ liên hệ bạn trong 30 phút.',
          fields: CONTACT_FORM_FIELDS(),
        },
      ],
    },
  },
  {
    key: 'filler-botox',
    label: 'Tiêm Filler & Botox',
    category: 'Dịch vụ',
    description: 'Landing page tiêm filler và botox: ứng dụng, kết quả, an toàn và form.',
    blockSummary: ['Hero', 'Botox ứng dụng ×3', 'Filler ứng dụng ×3', 'An toàn & thương hiệu', 'Form tư vấn'],
    page: {
      slug: 'tiem-filler-botox',
      path: '/tiem-filler-botox',
      title: 'Tiêm Filler & Botox – Trẻ đẹp tức thì',
      description: 'Tiêm Filler Juvederm và Botox Allergan chuẩn y khoa – trẻ hóa tức thì, không cần phẫu thuật.',
      seoTitle: 'Tiêm Filler & Botox – Thiện Chánh Clinic',
      seoDescription: 'Tiêm Filler Juvederm, Botox Allergan tại Thiện Chánh Clinic. Bác sĩ Allergan Master, sản phẩm chính hãng, an toàn tuyệt đối.',
      isPublished: false,
      blocks: [
        { id: makeId(), type: 'title', row: 1, span: 12, order: 1, title: 'Tiêm Filler & Botox – Trẻ đẹp không cần dao kéo', level: 1, align: 'center' },
        { id: makeId(), type: 'text', row: 2, span: 12, order: 2, text: 'Filler và Botox là hai kỹ thuật tiêm phi phẫu thuật được sử dụng phổ biến nhất thế giới hiện nay. Khi được thực hiện bởi bác sĩ giàu kinh nghiệm với sản phẩm chính hãng, đây là cách trẻ hóa an toàn, nhanh chóng và hiệu quả nhất.', align: 'center' },
        { id: makeId(), type: 'title', row: 3, span: 12, order: 3, title: 'Botox – Xóa nếp nhăn, thon gọn hàm', level: 2, align: 'left' },
        { id: makeId(), type: 'text', row: 4, span: 4, order: 4, text: '🔸 Xóa nếp nhăn trán\nGiảm nếp nhăn ngang trán, giữ vẻ tự nhiên khi biểu cảm. Kết quả 4–6 tháng.', align: 'left' },
        { id: makeId(), type: 'text', row: 4, span: 4, order: 5, text: '🔸 Trị nhăn vùng mắt\nXóa nếp chân chim, nhăn vùng dưới mắt – trông trẻ hơn 5–7 tuổi.', align: 'left' },
        { id: makeId(), type: 'text', row: 4, span: 4, order: 6, text: '🔸 Gọn cơ hàm (V-Face)\nTiêm vào cơ cắn để thu nhỏ hàm vuông, tạo khuôn mặt thon V tự nhiên trong 4–6 tuần.', align: 'left' },
        { id: makeId(), type: 'title', row: 5, span: 12, order: 7, title: 'Filler – Độn, tạo khối, trẻ hóa', level: 2, align: 'left' },
        { id: makeId(), type: 'text', row: 6, span: 4, order: 8, text: '💎 Filler môi\nTạo môi đầy đặn, căng mọng tự nhiên. Tùy chỉnh hình dạng và độ dày theo mong muốn.', align: 'left' },
        { id: makeId(), type: 'text', row: 6, span: 4, order: 9, text: '💎 Filler gò má\nTạo gò má cao, trán tròn đầy – khuôn mặt tươi trẻ, không lão hóa.', align: 'left' },
        { id: makeId(), type: 'text', row: 6, span: 4, order: 10, text: '💎 Filler cằm & mũi\nCải thiện tỷ lệ khuôn mặt tức thì – không phẫu thuật, không thời gian phục hồi.', align: 'left' },
        { id: makeId(), type: 'title', row: 7, span: 12, order: 11, title: 'Cam kết an toàn 100%', level: 2, align: 'center' },
        { id: makeId(), type: 'text', row: 8, span: 3, order: 12, text: '🏷️ Hàng chính hãng\nJuvederm, Allergan, Restylane – có tem chống hàng giả, truy xuất nguồn gốc', align: 'center' },
        { id: makeId(), type: 'text', row: 8, span: 3, order: 13, text: '👨‍⚕️ Bác sĩ được cấp phép\nAllergan Master Injector – chứng chỉ quốc tế về kỹ thuật tiêm thẩm mỹ', align: 'center' },
        { id: makeId(), type: 'text', row: 8, span: 3, order: 14, text: '🔬 Kiểm tra trước tiêm\nKhám kỹ, test phản ứng, loại trừ chống chỉ định trước mỗi ca', align: 'center' },
        { id: makeId(), type: 'text', row: 8, span: 3, order: 15, text: '📞 Theo dõi sau tiêm\nHỗ trợ 24/7 trong 72 giờ đầu, tái khám sau 2 tuần miễn phí', align: 'center' },
        {
          id: makeId(), type: 'form', row: 9, span: 12, order: 16,
          title: 'Tư vấn & kiểm tra miễn phí',
          description: 'Bác sĩ sẽ đánh giá và tư vấn liệu trình Filler/Botox phù hợp với khuôn mặt của bạn.',
          submitLabel: 'Đặt lịch tư vấn miễn phí',
          successMessage: 'Đã nhận! Bác sĩ sẽ liên hệ bạn sớm nhất.',
          fields: CONTACT_FORM_FIELDS(),
        },
      ],
    },
  },
  {
    key: 'dieu-tri-mun',
    label: 'Điều trị mụn & Da',
    category: 'Dịch vụ',
    description: 'Landing page điều trị mụn, thâm, sẹo và chăm sóc da chuyên sâu.',
    blockSummary: ['Hero', 'Loại mụn & giải pháp ×3', 'Video quy trình', 'Phác đồ 3 bước', 'Form'],
    page: {
      slug: 'dieu-tri-mun-da',
      path: '/dieu-tri-mun-da',
      title: 'Điều trị mụn & Chăm sóc da chuyên sâu',
      description: 'Liệu trình điều trị mụn, thâm, sẹo rỗ bằng công nghệ laser và hóa chất y tế chuẩn.',
      seoTitle: 'Điều trị mụn chuyên sâu – Thiện Chánh Clinic',
      seoDescription: 'Điều trị mụn viêm, mụn đầu đen, thâm, sẹo rỗ bằng công nghệ laser CO2, AHA/BHA tại Thiện Chánh Clinic.',
      isPublished: false,
      blocks: [
        { id: makeId(), type: 'title', row: 1, span: 12, order: 1, title: 'Điều trị mụn tận gốc – Sẹo không còn là nỗi lo', level: 1, align: 'center' },
        { id: makeId(), type: 'text', row: 2, span: 12, order: 2, text: 'Mụn không chỉ là vấn đề da – đây là vấn đề y tế cần được chẩn đoán và điều trị đúng phác đồ. Tại Thiện Chánh Clinic, bác sĩ da liễu thẩm mỹ sẽ phân tích loại mụn, nguyên nhân và thiết kế liệu trình cá nhân hóa cho bạn.', align: 'center' },
        { id: makeId(), type: 'title', row: 3, span: 12, order: 3, title: 'Chúng tôi điều trị được gì?', level: 2, align: 'center' },
        { id: makeId(), type: 'text', row: 4, span: 4, order: 4, text: '🔴 Mụn viêm – mụn nang\nDiệt khuẩn từ sâu bằng ánh sáng Blue LED + thuốc bôi y tế. Giảm 70% mụn viêm sau 4 tuần.', align: 'left' },
        { id: makeId(), type: 'text', row: 4, span: 4, order: 5, text: '⚫ Mụn đầu đen & cám\nLột da hóa học AHA/BHA, hút nhân mụn chuyên sâu. Lỗ chân lông thu nhỏ, da thông thoáng.', align: 'left' },
        { id: makeId(), type: 'text', row: 4, span: 4, order: 6, text: '🟤 Thâm mụn & Sẹo rỗ\nLaser CO2 Fractional tái tạo da, xóa thâm, lấp đầy sẹo rỗ. Kết quả rõ rệt sau 3–5 buổi.', align: 'left' },
        { id: makeId(), type: 'video', row: 5, span: 12, order: 7, url: '', title: 'Quy trình điều trị mụn tại Thiện Chánh Clinic' },
        { id: makeId(), type: 'title', row: 6, span: 12, order: 8, title: 'Phác đồ 3 giai đoạn', level: 2, align: 'center' },
        { id: makeId(), type: 'text', row: 7, span: 4, order: 9, text: 'Giai đoạn 1 (Tuần 1–4)\n──────────────\n• Khám & chẩn đoán loại mụn\n• Làm sạch sâu, hút nhân mụn\n• Ánh sáng Blue LED diệt khuẩn\n• Thuốc bôi tại chỗ chuẩn y khoa', align: 'left' },
        { id: makeId(), type: 'text', row: 7, span: 4, order: 10, text: 'Giai đoạn 2 (Tuần 5–8)\n──────────────\n• Lột da AHA/BHA sâu\n• Mesotherapy nuôi dưỡng da\n• Kiểm soát nhờn, se khít lỗ chân lông\n• Ổn định nội tiết tố nếu cần', align: 'left' },
        { id: makeId(), type: 'text', row: 7, span: 4, order: 11, text: 'Giai đoạn 3 (Tháng 3–6)\n──────────────\n• Laser CO2 xóa thâm, sẹo\n• Điều chỉnh sắc tố, đều màu da\n• Duy trì với skincare routine\n• Tái khám định kỳ miễn phí', align: 'left' },
        {
          id: makeId(), type: 'form', row: 8, span: 12, order: 12,
          title: 'Khám da & nhận phác đồ cá nhân miễn phí',
          description: 'Bác sĩ da liễu sẽ phân tích tình trạng da của bạn và tư vấn liệu trình phù hợp.',
          submitLabel: 'Đặt lịch khám da miễn phí',
          successMessage: 'Đã nhận! Bác sĩ sẽ liên hệ xác nhận lịch trong 30 phút.',
          fields: CONTACT_FORM_FIELDS(),
        },
      ],
    },
  },

  // ─── Campaign ──────────────────────────────────────
  {
    key: 'khuyen-mai',
    label: 'Trang ưu đãi / Khuyến mãi',
    category: 'Campaign',
    description: 'Template ưu đãi theo tháng: banner, list dịch vụ giảm giá và form đăng ký.',
    blockSummary: ['Banner ưu đãi', 'Dịch vụ giảm giá ×3', 'Điều kiện', 'Form đăng ký'],
    page: {
      slug: 'uu-dai-thang-nay',
      path: '/uu-dai-thang-nay',
      title: 'Ưu đãi đặc biệt tháng này',
      description: 'Chương trình ưu đãi đặc biệt dành cho khách hàng mới và khách hàng thân thiết.',
      seoTitle: 'Ưu đãi dịch vụ thẩm mỹ – Thiện Chánh Clinic',
      seoDescription: 'Ưu đãi lên đến 30% dịch vụ thẩm mỹ tại Thiện Chánh Clinic. Số lượng có hạn – đăng ký ngay!',
      isPublished: false,
      blocks: [
        { id: makeId(), type: 'title', row: 1, span: 12, order: 1, title: '🎉 Ưu đãi đặc biệt tháng 7 – Giảm đến 30%', level: 1, align: 'center' },
        { id: makeId(), type: 'text', row: 2, span: 12, order: 2, text: 'Thiện Chánh Clinic mừng sinh nhật 10 năm với chương trình ưu đãi chưa từng có. Số lượng suất ưu đãi có hạn – đăng ký ngay để giữ chỗ!', align: 'center' },
        { id: makeId(), type: 'title', row: 3, span: 12, order: 3, title: 'Dịch vụ trong chương trình ưu đãi', level: 2, align: 'center' },
        { id: makeId(), type: 'text', row: 4, span: 4, order: 4, text: '👃 Nâng mũi cấu trúc\n~~45.000.000đ~~\n✅ Còn 32.000.000đ\n(Giảm 30% – chỉ 10 suất)\n\n• Sụn tự thân hoặc silicone\n• Bảo hành trọn đời\n• Gồm tái khám sau 1 & 3 tháng', align: 'left' },
        { id: makeId(), type: 'text', row: 4, span: 4, order: 5, text: '✨ HIFU Ultraformer III\n~~8.000.000đ~~\n✅ Còn 5.600.000đ\n(Giảm 30% – 20 suất)\n\n• 1 vùng toàn mặt\n• Kết quả 12–18 tháng\n• Không đau, không nghỉ dưỡng', align: 'left' },
        { id: makeId(), type: 'text', row: 4, span: 4, order: 6, text: '💉 Botox Allergan\n~~3.500.000đ~~\n✅ Còn 2.500.000đ\n(Giảm 28% – 30 suất)\n\n• 1 vùng: trán hoặc hàm\n• Hàng chính hãng có tem\n• Thực hiện bởi Allergan Master', align: 'left' },
        { id: makeId(), type: 'title', row: 5, span: 12, order: 7, title: 'Điều kiện áp dụng', level: 3, align: 'left' },
        { id: makeId(), type: 'text', row: 6, span: 12, order: 8, text: '• Áp dụng từ 01/07 – 31/07/2025 (hoặc đến khi hết suất)\n• Khách hàng cần đặt lịch tư vấn trước để giữ suất ưu đãi\n• Không áp dụng đồng thời với các chương trình khuyến mãi khác\n• Khám sàng lọc và xác nhận phù hợp trước khi thực hiện\n• Ưu đãi chỉ áp dụng tại cơ sở Quận 1', align: 'left' },
        {
          id: makeId(), type: 'form', row: 7, span: 12, order: 9,
          title: 'Đăng ký giữ suất ưu đãi ngay',
          description: 'Điền thông tin để đặt lịch tư vấn và giữ ưu đãi. Suất có hạn – đừng bỏ lỡ!',
          submitLabel: 'Đăng ký ngay',
          successMessage: 'Đã giữ suất! Chúng tôi sẽ gọi xác nhận trong 30 phút.',
          fields: [
            { id: makeId(), name: 'full_name', label: 'Họ và tên', type: 'text' as const, placeholder: 'Nguyễn Thị A', required: true, span: 6 },
            { id: makeId(), name: 'phone', label: 'Số điện thoại', type: 'tel' as const, placeholder: '0901 234 567', required: true, span: 6 },
            { id: makeId(), name: 'service', label: 'Dịch vụ muốn đăng ký', type: 'text' as const, placeholder: 'Nâng mũi / HIFU / Botox...', required: true, span: 12 },
          ],
        },
      ],
    },
  },
  {
    key: 'ads-landing',
    label: 'Landing quảng cáo (Facebook/Google Ads)',
    category: 'Campaign',
    description: 'Landing page tập trung chuyển đổi cho quảng cáo: USP nhanh, form ngắn gọn.',
    blockSummary: ['Hero CTA', 'USP ×3', 'Social proof ×3', 'Form ngắn gọn', 'Cam kết'],
    page: {
      slug: 'tu-van-mien-phi',
      path: '/tu-van-mien-phi',
      title: 'Tư vấn thẩm mỹ miễn phí – Thiện Chánh Clinic',
      description: 'Đặt lịch tư vấn miễn phí với bác sĩ chuyên khoa. Không ràng buộc, không chi phí ẩn.',
      seoTitle: 'Tư vấn thẩm mỹ miễn phí – Thiện Chánh Clinic',
      seoDescription: 'Tư vấn thẩm mỹ miễn phí 1-1 với bác sĩ chuyên khoa tại Thiện Chánh Clinic. Đặt lịch ngay – còn suất hôm nay!',
      isPublished: false,
      blocks: [
        { id: makeId(), type: 'title', row: 1, span: 12, order: 1, title: 'Tư vấn 1-1 với bác sĩ – Miễn phí 100%', level: 1, align: 'center' },
        { id: makeId(), type: 'text', row: 2, span: 12, order: 2, text: '⚡ Còn 5 suất tư vấn miễn phí hôm nay. Gặp bác sĩ chuyên khoa, nhận phác đồ cá nhân hóa – không mất một đồng.', align: 'center' },
        {
          id: makeId(), type: 'form', row: 3, span: 12, order: 3,
          title: 'Để lại số điện thoại – Bác sĩ gọi lại ngay',
          description: '',
          submitLabel: '🔥 Đăng ký tư vấn miễn phí ngay',
          successMessage: 'Tuyệt! Bác sĩ sẽ gọi cho bạn trong 15 phút.',
          fields: [
            { id: makeId(), name: 'full_name', label: 'Họ và tên', type: 'text' as const, placeholder: 'Nguyễn Thị A', required: true, span: 12 },
            { id: makeId(), name: 'phone', label: 'Số điện thoại', type: 'tel' as const, placeholder: '0901 234 567', required: true, span: 12 },
          ],
        },
        { id: makeId(), type: 'title', row: 4, span: 12, order: 4, title: 'Tại sao chọn Thiện Chánh?', level: 2, align: 'center' },
        { id: makeId(), type: 'text', row: 5, span: 4, order: 5, text: '✅ Bác sĩ 10+ năm\nChuyên khoa thẩm mỹ, được đào tạo quốc tế tại Hàn Quốc và Mỹ', align: 'center' },
        { id: makeId(), type: 'text', row: 5, span: 4, order: 6, text: '✅ Không ép dịch vụ\nTư vấn thật, không bán gói, không ràng buộc', align: 'center' },
        { id: makeId(), type: 'text', row: 5, span: 4, order: 7, text: '✅ 10.000+ khách hài lòng\nTỷ lệ khách hàng quay lại 78%', align: 'center' },
        { id: makeId(), type: 'title', row: 6, span: 12, order: 8, title: 'Khách hàng chia sẻ', level: 2, align: 'center' },
        { id: makeId(), type: 'text', row: 7, span: 4, order: 9, text: '"Lần đầu đến chỉ để hỏi, bác sĩ tư vấn rất thật, không hối thúc. Cuối cùng tôi đã làm và rất hài lòng!"\n⭐⭐⭐⭐⭐ – Chị Minh, 32 tuổi', align: 'left' },
        { id: makeId(), type: 'text', row: 7, span: 4, order: 10, text: '"Quy trình chuyên nghiệp từ A đến Z. Kết quả tự nhiên đến nỗi mọi người chỉ nói tôi trông trẻ ra chứ không biết tôi đã làm gì."\n⭐⭐⭐⭐⭐ – Chị Hà, 45 tuổi', align: 'left' },
        { id: makeId(), type: 'text', row: 7, span: 4, order: 11, text: '"Tôi lo sợ lắm vì lần đầu làm thẩm mỹ. Nhưng bác sĩ giải thích rõ ràng từng bước, tôi cảm thấy rất yên tâm."\n⭐⭐⭐⭐⭐ – Chị Thủy, 28 tuổi', align: 'left' },
        { id: makeId(), type: 'text', row: 8, span: 12, order: 12, text: '🛡️ Cam kết của chúng tôi: Tư vấn miễn phí, không ép mua, không chi phí ẩn. Bạn hoàn toàn tự quyết định sau khi nhận đủ thông tin từ bác sĩ.', align: 'center' },
      ],
    },
  },
]

function isYoutubeUrl(url: string) {
  return /youtube\.com|youtu\.be/.test(url)
}

function toEmbedUrl(url: string) {
  if (!isYoutubeUrl(url)) return url
  const shortMatch = url.match(/youtu\.be\/([^?]+)/)
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`
  const longMatch = url.match(/[?&]v=([^&]+)/)
  if (longMatch) return `https://www.youtube.com/embed/${longMatch[1]}`
  return url
}

function titleLevel(level?: number): 1 | 2 | 3 | 4 | 5 {
  const next = Math.max(1, Math.min(5, level || 2))
  return next as 1 | 2 | 3 | 4 | 5
}

export function LandingPagesPage() {
  const [pages, setPages] = useState<LandingPage[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Omit<LandingPage, 'id' | 'createdAt' | 'updatedAt'>>(emptyPage())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [templateModal, setTemplateModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [iframeKey, setIframeKey] = useState(0)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const selectedPage = useMemo(
    () => pages.find((item) => item.id === selectedId) || null,
    [pages, selectedId],
  )
  const previewUrl = useMemo(() => {
    const base = LANDING_URL
    const path = draft.path === '/' ? '' : draft.path
    return `${base.replace(/\/$/, '')}${path || '/'}`
  }, [draft.path])

  useEffect(() => {
    void loadPages()
  }, [])

  useEffect(() => {
    if (!selectedPage) return
    setDraft({
      slug: selectedPage.slug,
      path: selectedPage.path,
      title: selectedPage.title,
      description: selectedPage.description || '',
      seoTitle: selectedPage.seoTitle || '',
      seoDescription: selectedPage.seoDescription || '',
      blocks: (selectedPage.blocks || []).map((block) => ({
        ...block,
        fields: block.fields ? block.fields.map((field) => ({ ...field })) : undefined,
      })),
      isPublished: selectedPage.isPublished,
    })
  }, [selectedPage])

  async function loadPages(nextSelectedId?: string | null) {
    setLoading(true)
    try {
      const response = await api.get('/settings/landing-pages')
      const nextPages = response.data.data as LandingPage[]
      setPages(nextPages)

      if (typeof nextSelectedId !== 'undefined') {
        setSelectedId(nextSelectedId)
        return
      }

      if (!nextPages.length) {
        setSelectedId(null)
        setDraft(emptyPage())
        return
      }

      setSelectedId((current) => (current && nextPages.some((item) => item.id === current) ? current : nextPages[0].id))
    } finally {
      setLoading(false)
    }
  }

  function updateDraft(patch: Partial<typeof draft>) {
    setDraft((current) => ({ ...current, ...patch }))
  }

  function startCreatePage() {
    setTemplateModal(true)
  }

  function applyTemplate(template: PageTemplate) {
    setSelectedId(null)
    setDraft({
      ...template.page,
      blocks: template.page.blocks.map((block) => ({ ...block, id: makeId() })),
    })
    setTemplateModal(false)
  }

  async function applyAndSave(template: PageTemplate) {
    // Blank template: chỉ apply vào editor, không save
    if (!template.page.title.trim()) {
      applyTemplate(template)
      return
    }

    const blocks = template.page.blocks.map((block, index) => ({ ...block, id: makeId(), order: index + 1 }))
    const payload = {
      ...template.page,
      blocks,
      slug: slugify(template.page.slug || template.page.title),
      path: normalizePath(template.page.path || template.page.slug || template.page.title),
    }

    setTemplateModal(false)
    setSaving(true)
    try {
      const response = await api.post('/settings/landing-pages', payload)
      message.success(`Đã tạo page "${payload.title}"`)
      await loadPages(response.data.data.id)
    } catch {
      message.error('Tạo page thất bại')
    } finally {
      setSaving(false)
    }
  }

  function syncSlugFromTitle(title: string) {
    const nextSlug = slugify(title)
    setDraft((current) => ({
      ...current,
      title,
      slug: current.slug ? current.slug : nextSlug,
      path: current.path && current.path !== '/' ? current.path : normalizePath(nextSlug),
    }))
  }

  function updateBlock(blockId: string, patch: Partial<LandingBlock>) {
    setDraft((current) => ({
      ...current,
      blocks: current.blocks.map((block, index) =>
        block.id === blockId ? { ...block, ...patch, order: index + 1 } : block,
      ),
    }))
  }

  function addBlock(type: LandingBlockType) {
    setDraft((current) => {
      const nextRow = current.blocks.length ? Math.max(...current.blocks.map((block) => block.row)) + 1 : 1
      const block = { ...createBlock(type), row: nextRow, order: current.blocks.length + 1 }
      return {
        ...current,
        blocks: [...current.blocks, block],
      }
    })
  }

  function removeBlock(blockId: string) {
    setDraft((current) => ({
      ...current,
      blocks: current.blocks
        .filter((block) => block.id !== blockId)
        .map((block, index) => ({ ...block, order: index + 1 })),
    }))
  }

  function moveBlock(blockId: string, direction: -1 | 1) {
    setDraft((current) => {
      const index = current.blocks.findIndex((block) => block.id === blockId)
      const target = index + direction
      if (index < 0 || target < 0 || target >= current.blocks.length) return current
      const next = [...current.blocks]
      const [moved] = next.splice(index, 1)
      next.splice(target, 0, moved)
      return {
        ...current,
        blocks: next.map((block, orderIndex) => ({ ...block, order: orderIndex + 1 })),
      }
    })
  }

  function addFormField(blockId: string) {
    setDraft((current) => ({
      ...current,
      blocks: current.blocks.map((block) =>
        block.id === blockId
          ? { ...block, fields: [...(block.fields || []), createField()] }
          : block,
      ),
    }))
  }

  function updateFormField(blockId: string, fieldId: string, patch: Partial<LandingFormField>) {
    setDraft((current) => ({
      ...current,
      blocks: current.blocks.map((block) => {
        if (block.id !== blockId) return block
        return {
          ...block,
          fields: (block.fields || []).map((field) =>
            field.id === fieldId ? { ...field, ...patch } : field,
          ),
        }
      }),
    }))
  }

  function removeFormField(blockId: string, fieldId: string) {
    setDraft((current) => ({
      ...current,
      blocks: current.blocks.map((block) => {
        if (block.id !== blockId) return block
        return {
          ...block,
          fields: (block.fields || []).filter((field) => field.id !== fieldId),
        }
      }),
    }))
  }

  async function savePage() {
    const payload = {
      ...draft,
      slug: slugify(draft.slug || draft.title),
      path: normalizePath(draft.path || draft.slug || draft.title),
      blocks: draft.blocks.map((block, index) => ({ ...block, order: index + 1 })),
    }

    if (!payload.title.trim()) {
      message.error('Cần nhập tên page')
      return
    }

    setSaving(true)
    try {
      if (selectedId) {
        const response = await api.patch(`/settings/landing-pages/${selectedId}`, payload)
        message.success('Đã cập nhật landing page')
        await loadPages(response.data.data.id)
      } else {
        const response = await api.post('/settings/landing-pages', payload)
        message.success('Đã tạo landing page')
        await loadPages(response.data.data.id)
      }
    } finally {
      setSaving(false)
    }
  }

  async function saveAndOpen() {
    const payload = {
      ...draft,
      slug: slugify(draft.slug || draft.title),
      path: normalizePath(draft.path || draft.slug || draft.title),
      blocks: draft.blocks.map((block, index) => ({ ...block, order: index + 1 })),
    }
    if (!payload.title.trim()) {
      message.error('Cần nhập tên page')
      return
    }
    setSaving(true)
    try {
      let savedPath = payload.path
      if (selectedId) {
        const response = await api.patch(`/settings/landing-pages/${selectedId}`, payload)
        savedPath = response.data.data.path
        message.success('Đã cập nhật')
        await loadPages(response.data.data.id)
      } else {
        const response = await api.post('/settings/landing-pages', payload)
        savedPath = response.data.data.path
        message.success('Đã tạo landing page')
        await loadPages(response.data.data.id)
      }
      const base = LANDING_URL.replace(/\/$/, '')
      const path = savedPath === '/' ? '' : savedPath
      window.open(`${base}${path || '/'}`, '_blank', 'noreferrer')
    } finally {
      setSaving(false)
    }
  }

  async function deletePage() {
    if (!selectedId) return
    await api.delete(`/settings/landing-pages/${selectedId}`)
    message.success('Đã xóa landing page')
    await loadPages(null)
  }

  const rows = useMemo(() => {
    return [...draft.blocks]
      .sort((left, right) => left.order - right.order)
      .reduce<Record<number, LandingBlock[]>>((accumulator, block) => {
        accumulator[block.row] = [...(accumulator[block.row] || []), block]
        return accumulator
      }, {})
  }, [draft.blocks])

  const iframeUrl = useMemo(() => {
    const sep = previewUrl.includes('?') ? '&' : '?'
    return editMode ? `${previewUrl}${sep}cms_edit=1` : previewUrl
  }, [previewUrl, editMode])

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!editMode) return
      const data = event.data as { type?: string; blockId?: string }
      if (data?.type === 'cms-block-select' && data.blockId) {
        setSelectedBlockId(data.blockId)
        document.getElementById(`block-panel-${data.blockId}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [editMode])

  function blockPreview(block: LandingBlock): string {
    const text = block.title ?? block.text ?? block.url ?? ''
    return text.slice(0, 50)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', gap: 0 }}>
      {/* ── Header ── */}
      <div className="page-header" style={{ flexShrink: 0 }}>
        <Flex align="center" gap={12} wrap="wrap">
          <Typography.Title level={3} style={{ margin: 0 }}>Landing pages</Typography.Title>
          <Select
            style={{ minWidth: 240 }}
            placeholder="Chọn page..."
            value={selectedId}
            onChange={(id) => setSelectedId(id)}
            loading={loading}
            options={pages.map((p) => ({ value: p.id, label: p.title || p.path || p.slug }))}
          />
          <Tag color={draft.isPublished ? 'green' : 'default'}>
            {draft.isPublished ? 'Đã xuất bản' : 'Nháp'}
          </Tag>
        </Flex>
        <Space wrap>
          <Button icon={<PlusOutlined />} onClick={startCreatePage}>Trang mới</Button>
          {selectedId ? (
            <Popconfirm title="Xóa landing page này?" onConfirm={() => void deletePage()}>
              <Button danger icon={<DeleteOutlined />}>Xóa</Button>
            </Popconfirm>
          ) : null}
          <Button icon={<SaveOutlined />} loading={saving} onClick={savePage}>Lưu</Button>
          <Button icon={<EyeOutlined />} loading={saving} type="primary" onClick={() => void saveAndOpen()}>Lưu & Mở</Button>
        </Space>
      </div>

      {/* ── Two-column body ── */}
      <div style={{ flex: 1, display: 'flex', gap: 16, overflow: 'hidden', minHeight: 0, padding: '0 0 16px' }}>

        {/* Left 30% — info + blocks + theme */}
        <div style={{ width: '30%', minWidth: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
          <Tabs
            size="small"
            style={{ flex: 1 }}
            items={[
              {
                key: 'content',
                label: 'Nội dung',
                children: (
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    {/* Page meta */}
                    <Card className="glass-card" size="small" title="Thông tin page">
                      <Form layout="vertical" size="small">
                        <Form.Item label="Tên page" style={{ marginBottom: 8 }}>
                          <Input value={draft.title} onChange={(event) => syncSlugFromTitle(event.target.value)} placeholder="Ví dụ: Trang chủ" />
                        </Form.Item>
                        <Row gutter={8}>
                          <Col span={12}>
                            <Form.Item label="Slug" style={{ marginBottom: 8 }}>
                              <Input value={draft.slug} onChange={(event) => updateDraft({ slug: slugify(event.target.value) })} placeholder="trang-chu" />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="Path" style={{ marginBottom: 8 }}>
                              <Input value={draft.path} onChange={(event) => updateDraft({ path: normalizePath(event.target.value) })} placeholder="/" />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Form.Item label="Mô tả ngắn" style={{ marginBottom: 8 }}>
                          <Input.TextArea rows={2} value={draft.description} onChange={(event) => updateDraft({ description: event.target.value })} />
                        </Form.Item>
                        <Row gutter={8}>
                          <Col span={12}>
                            <Form.Item label="SEO title" style={{ marginBottom: 8 }}>
                              <Input value={draft.seoTitle} onChange={(event) => updateDraft({ seoTitle: event.target.value })} />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="SEO desc" style={{ marginBottom: 8 }}>
                              <Input value={draft.seoDescription} onChange={(event) => updateDraft({ seoDescription: event.target.value })} />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Form.Item label="Xuất bản" style={{ marginBottom: 0 }}>
                          <Flex align="center" gap={8}>
                            <Switch size="small" checked={draft.isPublished} onChange={(checked) => updateDraft({ isPublished: checked })} />
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{draft.isPublished ? 'Đang public' : 'Draft'}</Typography.Text>
                          </Flex>
                        </Form.Item>
                      </Form>
                    </Card>

                    {/* Blocks */}
                    <Card
                      className="glass-card"
                      size="small"
                      title={<span>Blocks <Tag style={{ marginLeft: 4 }}>{draft.blocks.length}</Tag></span>}
                      extra={
                        <Flex gap={4} wrap="wrap">
                          {blockTypeOptions.map((option) => (
                            <Button key={option.value} size="small" icon={<PlusOutlined />} onClick={() => addBlock(option.value)}>
                              {option.label}
                            </Button>
                          ))}
                        </Flex>
                      }
                    >
                      {draft.blocks.length === 0 ? (
                        <Typography.Text type="secondary">Chưa có block nào</Typography.Text>
                      ) : (
                        <Collapse
                          accordion
                          size="small"
                          activeKey={selectedBlockId ?? undefined}
                          onChange={(key) => setSelectedBlockId((Array.isArray(key) ? key[0] : key) as string | null)}
                          items={draft.blocks.map((block, index) => ({
                            key: block.id,
                            id: `block-panel-${block.id}`,
                            label: (
                              <Flex align="center" gap={6}>
                                {blockTypeIcons[block.type]}
                                <span style={{ fontSize: 12 }}>
                                  {blockTypeOptions.find((o) => o.value === block.type)?.label} #{index + 1}
                                </span>
                                {blockPreview(block) ? (
                                  <Typography.Text type="secondary" style={{ fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {blockPreview(block)}
                                  </Typography.Text>
                                ) : null}
                              </Flex>
                            ),
                            extra: (
                              <Space size={0} onClick={(e) => e.stopPropagation()}>
                                <Button type="link" size="small" onClick={() => moveBlock(block.id, -1)} disabled={index === 0}>↑</Button>
                                <Button type="link" size="small" onClick={() => moveBlock(block.id, 1)} disabled={index === draft.blocks.length - 1}>↓</Button>
                                <Button type="link" size="small" danger onClick={() => removeBlock(block.id)}>×</Button>
                              </Space>
                            ),
                            children: (
                              <Form layout="vertical" size="small">
                                <Row gutter={8}>
                                  <Col span={8}>
                                    <Form.Item label="Row" style={{ marginBottom: 8 }}>
                                      <InputNumber min={1} value={block.row} onChange={(v) => updateBlock(block.id, { row: Number(v || 1) })} style={{ width: '100%' }} />
                                    </Form.Item>
                                  </Col>
                                  <Col span={8}>
                                    <Form.Item label="Span/12" style={{ marginBottom: 8 }}>
                                      <InputNumber min={1} max={12} value={block.span} onChange={(v) => updateBlock(block.id, { span: Number(v || 12) })} style={{ width: '100%' }} />
                                    </Form.Item>
                                  </Col>
                                  <Col span={8}>
                                    <Form.Item label="Align" style={{ marginBottom: 8 }}>
                                      <Select
                                        size="small"
                                        value={block.align || 'left'}
                                        onChange={(v) => updateBlock(block.id, { align: v })}
                                        disabled={!['title', 'text'].includes(block.type)}
                                        options={[{ value: 'left', label: 'Trái' }, { value: 'center', label: 'Giữa' }, { value: 'right', label: 'Phải' }]}
                                      />
                                    </Form.Item>
                                  </Col>
                                </Row>

                                {block.type === 'title' ? (
                                  <Row gutter={8}>
                                    <Col span={16}>
                                      <Form.Item label="Nội dung" style={{ marginBottom: 8 }}>
                                        <Input value={block.title} onChange={(e) => updateBlock(block.id, { title: e.target.value })} />
                                      </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                      <Form.Item label="Level" style={{ marginBottom: 8 }}>
                                        <InputNumber min={1} max={6} value={block.level || 2} onChange={(v) => updateBlock(block.id, { level: Number(v || 2) })} style={{ width: '100%' }} />
                                      </Form.Item>
                                    </Col>
                                  </Row>
                                ) : null}

                                {block.type === 'text' ? (
                                  <Form.Item label="Nội dung" style={{ marginBottom: 8 }}>
                                    <Input.TextArea rows={4} value={block.text} onChange={(e) => updateBlock(block.id, { text: e.target.value })} />
                                  </Form.Item>
                                ) : null}

                                {block.type === 'image' ? (
                                  <>
                                    <Form.Item label="URL ảnh" style={{ marginBottom: 8 }}>
                                      <Input value={block.url} onChange={(e) => updateBlock(block.id, { url: e.target.value })} placeholder="https://..." />
                                    </Form.Item>
                                    <Form.Item label="Alt" style={{ marginBottom: 8 }}>
                                      <Input value={block.alt} onChange={(e) => updateBlock(block.id, { alt: e.target.value })} />
                                    </Form.Item>
                                    <Form.Item label="Caption" style={{ marginBottom: 8 }}>
                                      <Input value={block.caption} onChange={(e) => updateBlock(block.id, { caption: e.target.value })} />
                                    </Form.Item>
                                  </>
                                ) : null}

                                {block.type === 'video' ? (
                                  <>
                                    <Form.Item label="URL video / YouTube" style={{ marginBottom: 8 }}>
                                      <Input value={block.url} onChange={(e) => updateBlock(block.id, { url: e.target.value })} placeholder="https://youtu.be/..." />
                                    </Form.Item>
                                    <Form.Item label="Tiêu đề video" style={{ marginBottom: 8 }}>
                                      <Input value={block.title} onChange={(e) => updateBlock(block.id, { title: e.target.value })} />
                                    </Form.Item>
                                  </>
                                ) : null}

                                {block.type === 'form' ? (
                                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                    <Row gutter={8}>
                                      <Col span={12}>
                                        <Form.Item label="Tên form" style={{ marginBottom: 8 }}>
                                          <Input value={block.title} onChange={(e) => updateBlock(block.id, { title: e.target.value })} />
                                        </Form.Item>
                                      </Col>
                                      <Col span={12}>
                                        <Form.Item label="Nút submit" style={{ marginBottom: 8 }}>
                                          <Input value={block.submitLabel} onChange={(e) => updateBlock(block.id, { submitLabel: e.target.value })} />
                                        </Form.Item>
                                      </Col>
                                    </Row>
                                    <Form.Item label="Mô tả form" style={{ marginBottom: 8 }}>
                                      <Input.TextArea rows={2} value={block.description} onChange={(e) => updateBlock(block.id, { description: e.target.value })} />
                                    </Form.Item>
                                    <Form.Item label="Thông báo thành công" style={{ marginBottom: 8 }}>
                                      <Input value={block.successMessage} onChange={(e) => updateBlock(block.id, { successMessage: e.target.value })} />
                                    </Form.Item>
                                    <Flex justify="space-between" align="center">
                                      <Typography.Text strong style={{ fontSize: 12 }}>Fields</Typography.Text>
                                      <Button size="small" icon={<PlusOutlined />} onClick={() => addFormField(block.id)}>Thêm field</Button>
                                    </Flex>
                                    {(block.fields || []).map((field) => (
                                      <Card key={field.id} size="small">
                                        <Row gutter={8}>
                                          <Col span={12}>
                                            <Form.Item label="Label" style={{ marginBottom: 6 }}>
                                              <Input size="small" value={field.label} onChange={(e) => updateFormField(block.id, field.id, { label: e.target.value })} />
                                            </Form.Item>
                                          </Col>
                                          <Col span={12}>
                                            <Form.Item label="Name" style={{ marginBottom: 6 }}>
                                              <Input size="small" value={field.name} onChange={(e) => updateFormField(block.id, field.id, { name: slugify(e.target.value).replace(/-/g, '_') })} />
                                            </Form.Item>
                                          </Col>
                                          <Col span={8}>
                                            <Form.Item label="Type" style={{ marginBottom: 6 }}>
                                              <Select
                                                size="small"
                                                value={field.type}
                                                onChange={(v) => updateFormField(block.id, field.id, { type: v })}
                                                options={[
                                                  { value: 'text', label: 'Text' },
                                                  { value: 'textarea', label: 'Textarea' },
                                                  { value: 'email', label: 'Email' },
                                                  { value: 'tel', label: 'Tel' },
                                                  { value: 'number', label: 'Số' },
                                                ]}
                                              />
                                            </Form.Item>
                                          </Col>
                                          <Col span={8}>
                                            <Form.Item label="Span" style={{ marginBottom: 6 }}>
                                              <InputNumber size="small" min={1} max={12} value={field.span} onChange={(v) => updateFormField(block.id, field.id, { span: Number(v || 12) })} style={{ width: '100%' }} />
                                            </Form.Item>
                                          </Col>
                                          <Col span={8}>
                                            <Form.Item label="Bắt buộc" style={{ marginBottom: 6 }}>
                                              <Switch size="small" checked={field.required} onChange={(checked) => updateFormField(block.id, field.id, { required: checked })} />
                                            </Form.Item>
                                          </Col>
                                          <Col span={20}>
                                            <Form.Item label="Placeholder" style={{ marginBottom: 0 }}>
                                              <Input size="small" value={field.placeholder} onChange={(e) => updateFormField(block.id, field.id, { placeholder: e.target.value })} />
                                            </Form.Item>
                                          </Col>
                                          <Col span={4}>
                                            <Form.Item label=" " style={{ marginBottom: 0 }}>
                                              <Button size="small" danger block onClick={() => removeFormField(block.id, field.id)}>×</Button>
                                            </Form.Item>
                                          </Col>
                                        </Row>
                                      </Card>
                                    ))}
                                  </Space>
                                ) : null}
                              </Form>
                            ),
                          }))}
                        />
                      )}
                    </Card>
                  </Space>
                ),
              },
              {
                key: 'theme',
                label: 'Giao diện',
                children: <LandingThemeEditor />,
              },
            ]}
          />
        </div>

        {/* Right 70% — iframe preview */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, gap: 8 }}>
          <Flex align="center" justify="space-between" style={{ flexShrink: 0 }}>
            <Space>
              <Button
                type={editMode ? 'primary' : 'default'}
                icon={<EditOutlined />}
                onClick={() => {
                  setEditMode((prev) => !prev)
                  setIframeKey((k) => k + 1)
                }}
              >
                {editMode ? 'Chế độ edit (bật)' : 'Chế độ edit'}
              </Button>
              <Button icon={<ReloadOutlined />} onClick={() => setIframeKey((k) => k + 1)}>Tải lại</Button>
            </Space>
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>{previewUrl}</Typography.Text>
          </Flex>
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={iframeUrl}
            style={{ flex: 1, border: '1px solid #d9d9d9', borderRadius: 8, background: '#fff', minHeight: 400 }}
            title="Landing page preview"
          />
        </div>
      </div>

      {/* ── Template Modal ── */}
      <Modal
        footer={null}
        onCancel={() => setTemplateModal(false)}
        open={templateModal}
        title="Chọn template cho page mới"
        width={780}
      >
        <Tabs
          style={{ marginTop: 4 }}
          items={[...new Set(PAGE_TEMPLATES.map((t) => t.category))].map((category) => ({
            key: category,
            label: category,
            children: (
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                {PAGE_TEMPLATES.filter((t) => t.category === category).map((template) => (
                  <Card
                    hoverable
                    key={template.key}
                    onClick={() => void applyAndSave(template)}
                    size="small"
                    style={{ cursor: 'pointer' }}
                  >
                    <Flex gap={16} align="flex-start">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Flex align="center" gap={8} style={{ marginBottom: 4 }}>
                          <Typography.Text strong>{template.label}</Typography.Text>
                          {template.page.blocks.length > 0 && (
                            <Tag color="blue">{template.page.blocks.length} blocks</Tag>
                          )}
                        </Flex>
                        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                          {template.description}
                        </Typography.Text>
                        {template.blockSummary.length > 0 && (
                          <Flex gap={4} wrap="wrap" style={{ marginTop: 8 }}>
                            {template.blockSummary.map((item) => (
                              <Tag key={item} style={{ fontSize: 11, margin: 0 }}>{item}</Tag>
                            ))}
                          </Flex>
                        )}
                      </div>
                      <Button
                        loading={saving}
                        size="small"
                        type="primary"
                        onClick={(e) => { e.stopPropagation(); void applyAndSave(template) }}
                      >
                        {template.page.title ? 'Áp dụng & Lưu' : 'Chọn'}
                      </Button>
                    </Flex>
                  </Card>
                ))}
              </Space>
            ),
          }))}
        />
      </Modal>
    </div>
  )
}
