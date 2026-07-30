import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LocationCountry, LocationProvince, LocationWard } from '../entities/entities';

type ApiWard = { code: number; name: string; division_type?: string };
type ApiProvince = { code: number; name: string; division_type?: string; wards?: ApiWard[] };
@Injectable()
export class LocationsService {
  private loading?: Promise<void>;
  constructor(@InjectRepository(LocationCountry) private readonly countriesRepo: Repository<LocationCountry>, @InjectRepository(LocationProvince) private readonly provincesRepo: Repository<LocationProvince>, @InjectRepository(LocationWard) private readonly wardsRepo: Repository<LocationWard>) {}
  private async ensureVietnam() {
    if (await this.provincesRepo.count({ where: { countryCode: 'VN' } }) >= 34) return;
    if (!this.loading) this.loading = this.importVietnam().finally(() => { this.loading = undefined; });
    await this.loading;
  }
  private async importVietnam() {
    const response = await fetch('https://provinces.open-api.vn/api/v2/?depth=2');
    if (!response.ok) throw new Error('Không thể tải danh mục hành chính Việt Nam');
    const data = await response.json() as ApiProvince[];
    await this.countriesRepo.save(this.countriesRepo.create({ code: 'VN', name: 'Việt Nam' }));
    await this.wardsRepo.clear(); await this.provincesRepo.clear();
    await this.provincesRepo.save(data.map((item) => this.provincesRepo.create({ code: String(item.code), countryCode: 'VN', name: item.name, divisionType: item.division_type })));
    await this.wardsRepo.save(data.flatMap((province) => (province.wards || []).map((ward) => this.wardsRepo.create({ code: String(ward.code), provinceCode: String(province.code), name: ward.name, divisionType: ward.division_type }))));
  }
  async countries() { await this.ensureVietnam(); return { data: await this.countriesRepo.find({ order: { name: 'ASC' } }) }; }
  async provinces(countryCode = 'VN') { await this.ensureVietnam(); return { data: await this.provincesRepo.find({ where: { countryCode }, order: { name: 'ASC' } }) }; }
  async wards(provinceCode: string) { await this.ensureVietnam(); return { data: provinceCode ? await this.wardsRepo.find({ where: { provinceCode }, order: { name: 'ASC' } }) : [] }; }
}
