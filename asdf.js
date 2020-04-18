let template =
  '<p>Motion: <span class="status">{motionTime}</span></p><p>Door at: <span class="status">{doorTime}</span></p></section>';

console.log('before: ');
  console.log(template);

  data = {
      motionTime: '234567',
      doorTime: '098765456789876545678987655678'

  }

  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const element = data[key];
      const regex = new RegExp("{" + key + "}");
      template = template.replace(regex, element);
    }
  }

  console.log('after: ');
  console.log(template);