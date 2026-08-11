import 'dart:convert';
import 'package:get/get.dart';
import 'package:get_storage/get_storage.dart';
import '../../data/models/customer.dart';
import '../storage/storage_keys.dart';

class SessionController extends GetxController {
  final _storage = GetStorage();
  final Rxn<Customer> customer = Rxn<Customer>();

  bool get isLoggedIn => customer.value != null;

  @override
  void onInit() {
    super.onInit();
    final raw = _storage.read<String>(StorageKeys.customerProfile);
    final token = _storage.read<String>(StorageKeys.accessToken);
    if (raw != null && token != null) {
      customer.value = Customer.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    }
  }

  Future<void> login(String accessToken, Customer profile) async {
    await _storage.write(StorageKeys.accessToken, accessToken);
    await _storage.write(StorageKeys.customerProfile, jsonEncode(_customerToJson(profile)));
    customer.value = profile;
  }

  void updateProfile(Customer profile) {
    _storage.write(StorageKeys.customerProfile, jsonEncode(_customerToJson(profile)));
    customer.value = profile;
  }

  Future<void> logout() async {
    await _storage.remove(StorageKeys.accessToken);
    await _storage.remove(StorageKeys.customerProfile);
    customer.value = null;
  }

  Map<String, dynamic> _customerToJson(Customer c) => {
        'id': c.id,
        'code': c.code,
        'fullName': c.fullName,
        'avatarUrl': c.avatarUrl,
        'phone': c.phone,
        'email': c.email,
        'gender': c.gender,
        'idNumber': c.idNumber,
        'address': c.address,
        'addressLine': c.addressLine,
        'tier': c.tier,
        'status': c.status,
        'totalSpent': c.totalSpent,
      };
}
