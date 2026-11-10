import os
import re

vue_file = r"c:\Users\PC\Desktop\phiếu kiểm tra ds-160\ds160-checker\src\components\WordPaper.vue"
mappings_file = r"c:\Users\PC\Desktop\phiếu kiểm tra ds-160\mappings_generated.txt"

with open(mappings_file, "r", encoding="utf-8") as f:
    generated_mappings = f.read().strip().split("\n")

# Extract only standard mappings from generated
mappings_lines = []
for line in generated_mappings:
    # check if we should skip some custom ones
    skip = False
    for custom in ["Surnames", "Given Names", "Full Name in Native Language", "Sex", "Date of Birth", "City of Birth", "National Identification Number", "Primary Phone Number", "Email Address", "Primary Occupation", "Present Employer or School Name", "Passport/Travel Document Number", "Full Name"]:
        if f'label: "{custom}"' in line:
            skip = True
    if not skip:
        mappings_lines.append(line.rstrip(','))

joined_mappings = ",\n".join(mappings_lines)

with open(vue_file, "r", encoding="utf-8") as f:
    vue_content = f.read()

start_idx = vue_content.find("const mappings = [")
end_idx = vue_content.find("  ]", start_idx) + 3

existing_mappings = vue_content[start_idx:end_idx]

# We will inject the new mappings before the closing bracket of the array
insertion_point = existing_mappings.rfind("  ]")

new_mappings_array = existing_mappings[:insertion_point] + ",\n" + joined_mappings + "\n  ]"

new_vue_content = vue_content[:start_idx] + new_mappings_array + vue_content[end_idx:]

with open(vue_file, "w", encoding="utf-8") as f:
    f.write(new_vue_content)

print("Updated WordPaper.vue successfully")
