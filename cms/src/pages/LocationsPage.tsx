import { Card, Col, Empty, Row, Select, Table, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { api } from '../api'

type Province = { code: string; name: string; divisionType?: string }
type Ward = { code: string; name: string; divisionType?: string }
type Country = { code: string; name: string }
export function LocationsPage() {
  const [countries, setCountries] = useState<Country[]>([])
  const [countryCode, setCountryCode] = useState('VN')
  const [provinces, setProvinces] = useState<Province[]>([])
  const [provinceCode, setProvinceCode] = useState<string>()
  const [wards, setWards] = useState<Ward[]>([])
  useEffect(() => { api.get('/locations/countries').then((response) => setCountries(response.data.data || [])); api.get('/locations/provinces', { params: { countryCode } }).then((response) => setProvinces(response.data.data || [])) }, [countryCode])
  useEffect(() => { if (!provinceCode) { setWards([]); return }; api.get('/locations/wards', { params: { provinceCode } }).then((response) => setWards(response.data.data || [])) }, [provinceCode])
  return <Card title="Master Data — Địa chỉ">
    <Typography.Paragraph type="secondary">Danh mục quốc gia được seed từ source; địa giới Việt Nam dùng snapshot sau sáp nhập 07/2025.</Typography.Paragraph>
    <Select showSearch optionFilterProp="label" value={countryCode} onChange={(value) => { setCountryCode(value); setProvinceCode(undefined) }} options={countries.map((item) => ({ value: item.code, label: item.name }))} style={{ width: 300, marginBottom: 16 }} placeholder="Đất nước" />
    <Row gutter={16}><Col xs={24} md={10}><Table rowKey="code" size="small" dataSource={provinces} pagination={false} rowSelection={{ type: 'radio', selectedRowKeys: provinceCode ? [provinceCode] : [], onChange: (keys) => setProvinceCode(String(keys[0] || '')) }} columns={[{ title: 'Tỉnh / Thành phố', dataIndex: 'name' }, { title: 'Loại', dataIndex: 'divisionType' }]} /></Col>
    <Col xs={24} md={14}><Select allowClear showSearch optionFilterProp="label" placeholder="Chọn tỉnh/thành để xem phường/xã" style={{ width: '100%', marginBottom: 12 }} value={provinceCode} onChange={setProvinceCode} options={provinces.map((item) => ({ value: item.code, label: item.name }))} />{provinceCode ? <Table rowKey="code" size="small" dataSource={wards} pagination={{ pageSize: 50 }} columns={[{ title: 'Phường / Xã', dataIndex: 'name' }, { title: 'Loại', dataIndex: 'divisionType' }]} /> : <Empty description="Chọn tỉnh/thành" />}</Col></Row>
  </Card>
}
