import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Repository } from 'typeorm';
import { LocationCountry, LocationProvince, LocationWard } from '../entities/entities';

type ApiWard = { code: number; name: string; division_type?: string };
type ApiProvince = { code: number; name: string; division_type?: string; wards?: ApiWard[] };
type Country = { code: string; name: string };
@Injectable()
export class LocationsService {
  private loading?: Promise<void>;
  constructor(@InjectRepository(LocationCountry) private readonly countriesRepo: Repository<LocationCountry>, @InjectRepository(LocationProvince) private readonly provincesRepo: Repository<LocationProvince>, @InjectRepository(LocationWard) private readonly wardsRepo: Repository<LocationWard>) {}
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
  async countries() { await this.ensureVietnam(); return { data: await this.countriesRepo.find({ order: { name: 'ASC' } }) }; }
  async provinces(countryCode = 'VN') { await this.ensureVietnam(); return { data: await this.provincesRepo.find({ where: { countryCode }, order: { name: 'ASC' } }) }; }
  async wards(provinceCode: string) { await this.ensureVietnam(); return { data: provinceCode ? await this.wardsRepo.find({ where: { provinceCode }, order: { name: 'ASC' } }) : [] }; }
}
