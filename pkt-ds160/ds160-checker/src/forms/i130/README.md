# I-130/I-130A split-by-case structure

Phần I-130/I-130A đã được tách theo từng diện để sửa diện này không nhảy sang diện khác.

## File điều phối

- `src/components/I130AWordPaper.vue`: chỉ chọn component theo diện hồ sơ.
- `src/forms/i130/relationship-resolver.js`: nhận diện diện hồ sơ.
- `src/forms/i130a-mappings.js`: legacy wrapper, chuyển tiếp vào module đúng diện.
- `src/forms/i130a-dynamic-sections.js`: legacy wrapper, chuyển tiếp vào module đúng diện.

## Folder riêng từng diện

- `src/components/i130/cases/spouse/I130AWordPaper.vue`
- `src/components/i130/cases/child/I130AWordPaper.vue`
- `src/components/i130/cases/parent/I130AWordPaper.vue`
- `src/components/i130/cases/sibling/I130AWordPaper.vue`
- `src/components/i130/cases/fiance/I130AWordPaper.vue`

- `src/forms/i130/cases/spouse/i130a-mappings.js`
- `src/forms/i130/cases/child/i130a-mappings.js`
- `src/forms/i130/cases/parent/i130a-mappings.js`
- `src/forms/i130/cases/sibling/i130a-mappings.js`
- `src/forms/i130/cases/fiance/i130a-mappings.js`

- `src/forms/i130/cases/spouse/i130a-dynamic-sections.js`
- `src/forms/i130/cases/child/i130a-dynamic-sections.js`
- `src/forms/i130/cases/parent/i130a-dynamic-sections.js`
- `src/forms/i130/cases/sibling/i130a-dynamic-sections.js`
- `src/forms/i130/cases/fiance/i130a-dynamic-sections.js`

## Nguyên tắc sửa

- Sửa riêng diện vợ chồng: chỉ sửa trong folder `spouse`.
- Sửa riêng diện con cái: chỉ sửa trong folder `child`.
- Sửa riêng diện cha mẹ: chỉ sửa trong folder `parent`.
- Sửa riêng diện anh chị em: chỉ sửa trong folder `sibling`.
- Không sửa DS-160.
