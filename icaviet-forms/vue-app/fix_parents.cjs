const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(dir).filter(f => f.endsWith('Form.vue'));

// The old address block for both Cha and Me (NDBL format - no flex-1)
// Matches: <div class="md:col-span-2">...Địa chỉ ở (nếu mất, ghi năm mất)...AddressSelect...
const oldAddressBlockCha = `                <div class="md:col-span-2">
                  <label class="block text-sm text-gray-600 mb-1">{{ t('Địa chỉ ở (nếu mất, ghi năm mất):', 'Address (if deceased, state year of death):') }}</label>
                  <AddressSelect v-model="item.diaChi" baseClass="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
              </div>
            </div>
            <button type="button" @click="addRow(formValues.thongTinCha,`;

const newAddressBlockCha = `                <div class="md:col-span-2">
                  <label class="block text-sm text-gray-600 mb-1">{{ t('Cha còn sống hay đã mất?', 'Is father alive or deceased?') }} <span class="text-red-500">*</span></label>
                  <div class="flex gap-6 mt-1">
                    <label class="flex items-center cursor-pointer">
                      <input type="radio" v-model="item.conSong" value="Còn sống" class="w-4 h-4 text-blue-600 focus:ring-blue-500" required>
                      <span class="ml-2 text-gray-700 text-sm">{{ t('Còn sống', 'Alive') }}</span>
                    </label>
                    <label class="flex items-center cursor-pointer">
                      <input type="radio" v-model="item.conSong" value="Đã mất" class="w-4 h-4 text-blue-600 focus:ring-blue-500" required>
                      <span class="ml-2 text-gray-700 text-sm">{{ t('Đã mất', 'Deceased') }}</span>
                    </label>
                  </div>
                </div>
                <div v-if="item.conSong === 'Còn sống'" class="md:col-span-2">
                  <label class="block text-sm text-gray-600 mb-1">{{ t('Địa chỉ hiện tại:', 'Current address:') }}</label>
                  <AddressSelect v-model="item.diaChi" baseClass="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
                <div v-if="item.conSong === 'Đã mất'" class="md:col-span-2">
                  <label class="block text-sm text-gray-600 mb-1">{{ t('Năm mất:', 'Year of death:') }}</label>
                  <input type="number" v-model="item.namMat" min="1930" :max="new Date().getFullYear()" :placeholder="t('Nhập năm mất...', 'Enter year of death...')" class="w-full max-w-xs px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
                </div>
              </div>
            </div>
            <button type="button" @click="addRow(formValues.thongTinCha,`;

const oldAddressBlockMe = `                <div class="md:col-span-2">
                  <label class="block text-sm text-gray-600 mb-1">{{ t('Địa chỉ ở (nếu mất, ghi năm mất):', 'Address (if deceased, state year of death):') }}</label>
                  <AddressSelect v-model="item.diaChi" baseClass="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
              </div>
            </div>
            <button type="button" @click="addRow(formValues.thongTinMe,`;

const newAddressBlockMe = `                <div class="md:col-span-2">
                  <label class="block text-sm text-gray-600 mb-1">{{ t('Mẹ còn sống hay đã mất?', 'Is mother alive or deceased?') }} <span class="text-red-500">*</span></label>
                  <div class="flex gap-6 mt-1">
                    <label class="flex items-center cursor-pointer">
                      <input type="radio" v-model="item.conSong" value="Còn sống" class="w-4 h-4 text-blue-600 focus:ring-blue-500" required>
                      <span class="ml-2 text-gray-700 text-sm">{{ t('Còn sống', 'Alive') }}</span>
                    </label>
                    <label class="flex items-center cursor-pointer">
                      <input type="radio" v-model="item.conSong" value="Đã mất" class="w-4 h-4 text-blue-600 focus:ring-blue-500" required>
                      <span class="ml-2 text-gray-700 text-sm">{{ t('Đã mất', 'Deceased') }}</span>
                    </label>
                  </div>
                </div>
                <div v-if="item.conSong === 'Còn sống'" class="md:col-span-2">
                  <label class="block text-sm text-gray-600 mb-1">{{ t('Địa chỉ hiện tại:', 'Current address:') }}</label>
                  <AddressSelect v-model="item.diaChi" baseClass="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
                <div v-if="item.conSong === 'Đã mất'" class="md:col-span-2">
                  <label class="block text-sm text-gray-600 mb-1">{{ t('Năm mất:', 'Year of death:') }}</label>
                  <input type="number" v-model="item.namMat" min="1930" :max="new Date().getFullYear()" :placeholder="t('Nhập năm mất...', 'Enter year of death...')" class="w-full max-w-xs px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
                </div>
              </div>
            </div>
            <button type="button" @click="addRow(formValues.thongTinMe,`;

let totalUpdated = 0;
for (const file of files) {
    const p = path.join(dir, file);
    let content = fs.readFileSync(p, 'utf8');
    let changed = false;

    // Update data model if still using old format
    if (content.includes("thongTinCha: [{ ten: '', ngaySinh: '', noiSinh: '', diaChi: '' }]")) {
        content = content.replace(
            "thongTinCha: [{ ten: '', ngaySinh: '', noiSinh: '', diaChi: '' }]",
            "thongTinCha: [{ ten: '', ngaySinh: '', noiSinh: '', conSong: '', diaChi: '', namMat: '' }]"
        );
        changed = true;
    }
    if (content.includes("thongTinMe: [{ ten: '', ngaySinh: '', noiSinh: '', diaChi: '' }]")) {
        content = content.replace(
            "thongTinMe: [{ ten: '', ngaySinh: '', noiSinh: '', diaChi: '' }]",
            "thongTinMe: [{ ten: '', ngaySinh: '', noiSinh: '', conSong: '', diaChi: '', namMat: '' }]"
        );
        changed = true;
    }

    // Replace Cha address block (check for old text)
    if (content.includes("Địa chỉ ở (nếu mất, ghi năm mất):") && content.includes("thongTinCha")) {
        if (content.includes(oldAddressBlockCha)) {
            content = content.replace(oldAddressBlockCha, newAddressBlockCha);
            changed = true;
            console.log(`  - Updated Cha block in ${file}`);
        }
    }

    // Replace Me address block
    if (content.includes("Địa chỉ ở (nếu mất, ghi năm mất):") && content.includes("thongTinMe")) {
        if (content.includes(oldAddressBlockMe)) {
            content = content.replace(oldAddressBlockMe, newAddressBlockMe);
            changed = true;
            console.log(`  - Updated Me block in ${file}`);
        }
    }

    if (changed) {
        fs.writeFileSync(p, content);
        console.log(`Updated: ${file}`);
        totalUpdated++;
    } else {
        // Check if already updated
        if (content.includes('conSong') && content.includes('item.conSong')) {
            console.log(`Already updated: ${file}`);
        } else {
            console.log(`Skipped (no match): ${file}`);
        }
    }
}
console.log(`\nDone! Updated ${totalUpdated} files.`);
