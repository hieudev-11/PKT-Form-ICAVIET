const fs = require('fs');

const schemaPath = 'd:/form+pkt/icaviet-forms/forms/ds-160/schema.json';
const schemaData = fs.readFileSync(schemaPath, 'utf8');
const schema = JSON.parse(schemaData);

const workSection = schema.sections.find(s => s.id === 'part3_employment_education');

if (workSection) {
  const job2 = workSection.groups.find(g => g.id === 'job_2');
  let fieldsTemplate = [];
  
  if (job2) {
    fieldsTemplate = JSON.parse(JSON.stringify(job2.fields)).map(f => {
      f.id = f.id.replace('02', '');
      f.name = f.name.replace('02', '');
      if (f.label && f.label.vi) {
          f.label.vi = f.label.vi.replace('02', '').trim();
      }
      if (f.columnKey) {
          f.columnKey = f.columnKey.replace('02', '').trim();
      }
      return f;
    });
  }

  workSection.groups = workSection.groups.filter(g => g.id !== 'job_2' && g.id !== 'job_3');

  if (fieldsTemplate.length > 0) {
    const previousJobsGroup = {
      id: "previous_jobs_dynamic",
      title: { en: "Previous Employment", vi: "Công việc trước đây" },
      grid_cols: 1,
      fields: [
          {
              id: "previousJobsList",
              name: "previousJobsList",
              columnKey: "Công việc trước đây",
              type: "residence_period_table",
              label: {
                  en: "Were you previously employed?",
                  vi: "Bạn có làm việc ở đâu khác trong 5 năm qua không?"
              },
              required: false,
              is_repeatable: true,
              fields_template: fieldsTemplate
          }
      ]
    };

    const job1Index = workSection.groups.findIndex(g => g.id === 'job_1');
    if (job1Index !== -1) {
      workSection.groups.splice(job1Index + 1, 0, previousJobsGroup);
    } else {
      workSection.groups.push(previousJobsGroup);
    }
  }

  fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 4));
  console.log('Schema updated successfully.');
} else {
  console.log('Work section not found.');
}
