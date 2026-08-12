import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Repository } from 'typeorm';
import { LocationCountry, LocationProvince, LocationWard, MasterData } from '../entities/entities';

type ApiWard = { code: number; name: string; division_type?: string };
type ApiProvince = { code: number; name: string; division_type?: string; wards?: ApiWard[] };
type Country = { code: string; name: string };
@Injectable()
export class LocationsService {
  private loading?: Promise<void>;
  constructor(@InjectRepository(LocationCountry) private readonly countriesRepo: Repository<LocationCountry>, @InjectRepository(LocationProvince) private readonly provincesRepo: Repository<LocationProvince>, @InjectRepository(LocationWard) private readonly wardsRepo: Repository<LocationWard>, @InjectRepository(MasterData) private readonly masterDataRepo: Repository<MasterData>) {}
  private async ensureVietnam() {
    await this.ensureCountries();
    if (await this.provincesRepo.count({ where: { countryCode: 'VN' } }) >= 34) return;
    if (!this.loading) this.loading = this.importVietnam().finally(() => { this.loading = undefined; });
    await this.loading;
  }
  private async ensureCountries() {
    if (await this.countriesRepo.count() >= 200) return;
    const countries = JSON.parse(readFileSync(join(__dirname, 'countries.json'), 'utf8')) as Country[];
    await this.countriesRepo.upsert(countries, ['code']);
  }
  private async importVietnam() {
    const data = JSON.parse(readFileSync(join(__dirname, 'vietnam-admin-v2.json'), 'utf8')) as ApiProvince[];
    await this.wardsRepo.clear(); await this.provincesRepo.clear();
    await this.provincesRepo.save(data.map((item) => this.provincesRepo.create({ code: String(item.code), countryCode: 'VN', name: item.name, divisionType: item.division_type })));
    await this.wardsRepo.save(data.flatMap((province) => (province.wards || []).map((ward) => this.wardsRepo.create({ code: String(ward.code), provinceCode: String(province.code), name: ward.name, divisionType: ward.division_type }))));
  }
  async countries() { const data = await this.masterData('LOCATION_COUNTRY'); return { data: data.filter((item) => item.isActive).map((item) => ({ code: item.value, name: item.name })) }; }
  async provinces(countryCode = 'VN') { const data = await this.masterData('LOCATION_CITY'); return { data: data.filter((item) => item.isActive && item.parentValue === countryCode).map((item) => ({ code: item.value, name: item.name, divisionType: item.metadata?.divisionType })) }; }
  async wards(provinceCode: string) { const data = await this.masterData('LOCATION_WARD'); return { data: provinceCode ? data.filter((item) => item.isActive && item.parentValue === provinceCode).map((item) => ({ code: item.value, name: item.name, divisionType: item.metadata?.divisionType })) : [] }; }

  async ensureMasterData() {
    await this.ensureVietnam()
    if (await this.masterDataRepo.count({ where: { group: 'LOCATION_COUNTRY' } }) > 0) return
    const [countries, cities, wards] = await Promise.all([
      this.countriesRepo.find({ order: { name: 'ASC' } }),
      this.provincesRepo.find({ order: { name: 'ASC' } }),
      this.wardsRepo.find({ order: { name: 'ASC' } }),
    ])
    await this.masterDataRepo.save([
      ...countries.map((item, index) => this.masterDataRepo.create({ group: 'LOCATION_COUNTRY', name: item.name, value: item.code, sortOrder: index })),
      ...cities.map((item, index) => this.masterDataRepo.create({ group: 'LOCATION_CITY', name: item.name, value: item.code, parentValue: item.countryCode, sortOrder: index, metadata: { divisionType: item.divisionType } })),
      ...wards.map((item, index) => this.masterDataRepo.create({ group: 'LOCATION_WARD', name: item.name, value: item.code, parentValue: item.provinceCode, sortOrder: index, metadata: { divisionType: item.divisionType } })),
    ])
  }

  async masterData(group: string) {
    await this.ensureMasterData()
    return this.masterDataRepo.find({ where: { group }, order: { sortOrder: 'ASC', name: 'ASC' } })
  }

  async masterDataGroups() {
    return this.masterDataRepo.createQueryBuilder('item').select('item.group', 'group').distinct(true).orderBy('item.group', 'ASC').getRawMany<{ group: string }>()
  }

  async createMasterData(payload: Partial<MasterData>) {
    await this.ensureMasterData()
    return this.masterDataRepo.save(this.masterDataRepo.create({ ...payload, group: String(payload.group || ''), name: String(payload.name || ''), value: String(payload.value || '') }))
  }

  async updateMasterData(id: string, payload: Partial<MasterData>) {
    const item = await this.masterDataRepo.findOneByOrFail({ id })
    return this.masterDataRepo.save(this.masterDataRepo.merge(item, payload))
  }

  async removeMasterData(id: string) { await this.masterDataRepo.delete(id) }

  async seedMasterData(items: Array<Pick<MasterData, 'group' | 'name' | 'value'> & Partial<MasterData>>) {
    const keys = items.map((item) => `${item.group}:${item.value}`)
    const existing = await this.masterDataRepo.find()
    const existingKeys = new Set(existing.map((item) => `${item.group}:${item.value}`))
    const missing = items.filter((item) => !existingKeys.has(`${item.group}:${item.value}`))
    if (missing.length) await this.masterDataRepo.save(missing.map((item, sortOrder) => this.masterDataRepo.create({ ...item, sortOrder: item.sortOrder ?? sortOrder })))
    return { inserted: missing.length, requested: keys.length }
  }
}
