import { Col, Form, Input, Row, Select } from "antd"
import { useEffect, useState } from "react"
import { api } from "../api"

type Option = { code: string; name: string }
export function VietnamAddressFields({
  form,
}: {
  form: ReturnType<typeof Form.useForm>[0]
}) {
  const [provinces, setProvinces] = useState<Option[]>([])
  const [wards, setWards] = useState<Option[]>([])
  const provinceCode = Form.useWatch("provinceCode", form) as string | undefined
  useEffect(() => {
    api
      .get("/locations/provinces")
      .then((r) => setProvinces(r.data.data || []))
      .catch(() => setProvinces([]))
  }, [])
  useEffect(() => {
    if (!provinceCode) {
      setWards([])
      return
    }
    api
      .get("/locations/wards", { params: { provinceCode } })
      .then((r) => setWards(r.data.data || []))
      .catch(() => setWards([]))
  }, [provinceCode])
  return (
    <>
      <Col xs={24} md={8}>
        <Form.Item label="Quốc gia" name="countryCode" initialValue="VN">
          <Select options={[{ value: "VN", label: "Việt Nam" }]} />
        </Form.Item>
      </Col>
      <Col xs={24} md={8}>
        <Form.Item label="Tỉnh / Thành phố" name="provinceCode">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            options={provinces.map((x) => ({ value: x.code, label: x.name }))}
            onChange={(value) => {
              const item = provinces.find((x) => x.code === value)
              form.setFieldsValue({
                provinceName: item?.name,
                wardCode: undefined,
                wardName: undefined,
              })
            }}
          />
        </Form.Item>
      </Col>
      <Col xs={24} md={8}>
        <Form.Item label="Phường / Xã" name="wardCode">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            disabled={!provinceCode}
            options={wards.map((x) => ({ value: x.code, label: x.name }))}
            onChange={(value) =>
              form.setFieldValue(
                "wardName",
                wards.find((x) => x.code === value)?.name,
              )
            }
          />
        </Form.Item>
      </Col>
      <Form.Item hidden name="provinceName">
        <Input />
      </Form.Item>
      <Form.Item hidden name="wardName">
        <Input />
      </Form.Item>
      <Col span={24}>
        <Form.Item label="Số nhà, đường" name="addressLine">
          <Input />
        </Form.Item>
      </Col>
    </>
  )
}
