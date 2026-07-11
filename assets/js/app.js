(function () {
  'use strict';

  const loanMeta = {
    home: {
      title: 'Pinjaman Rumah',
      summaryTitle: 'Ringkasan Pinjaman Rumah',
      icon: 'bi-house-door',
      minYears: 5,
      maxYears: 35,
      defaultYears: 30,
      defaultValues: {
        price: 500000,
        deposit: 50000,
        rate: 4.2,
        years: 30,
        loan: 450000
      },
      comparisonYears: [20, 25, 30],
      method: 'reducing'
    },
    vehicle: {
      title: 'Pinjaman Kenderaan',
      summaryTitle: 'Ringkasan Pinjaman Kenderaan',
      icon: 'bi-car-front',
      minYears: 1,
      maxYears: 9,
      defaultYears: 7,
      defaultValues: {
        price: 100000,
        deposit: 10000,
        rate: 3,
        years: 7,
        loan: 90000
      },
      comparisonYears: [5, 7, 9],
      method: 'flat'
    },
    personal: {
      title: 'Pinjaman Peribadi',
      summaryTitle: 'Ringkasan Pinjaman Peribadi',
      icon: 'bi-person-vcard',
      minYears: 1,
      maxYears: 10,
      defaultYears: 5,
      defaultValues: {
        loan: 50000,
        rate: 6.5,
        years: 5,
        type: 'flat'
      },
      comparisonYears: [3, 5, 7],
      method: 'mixed'
    }
  };

  const state = {
    activeType: 'home',
    syncLocked: false,
    chart: null,
    lastResult: null
  };

  function parseNumber(value) {
    if (value === null || value === undefined) return NaN;
    const normalized = String(value).replace(/,/g, '').trim();
    if (normalized === '' || normalized === '-' || normalized === '.') return NaN;
    if (!/^-?(?:\d+|\d*\.\d+)$/.test(normalized)) return NaN;
    return Number(normalized);
  }

  function valueOrZero(value) {
    const number = parseNumber(value);
    return Number.isFinite(number) ? number : 0;
  }

  function roundMoney(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  function formatMoney(value) {
    const amount = Number.isFinite(value) ? value : 0;
    return new Intl.NumberFormat('ms-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount).replace('MYR', 'RM').replace(/\s+/g, ' ');
  }

  function formatPlainNumber(value, decimals) {
    if (!Number.isFinite(value)) return '';
    return new Intl.NumberFormat('ms-MY', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  }

  function formatPercent(value) {
    return `${formatPlainNumber(Number.isFinite(value) ? value : 0, 2)}%`;
  }

  function calculateAmortized(principal, annualRate, years) {
    const months = Math.round(years * 12);
    if (principal <= 0 || months <= 0) {
      return { monthlyPayment: 0, totalInterest: 0, totalPayment: 0, months };
    }

    const monthlyRate = annualRate / 100 / 12;
    let monthlyPayment;

    if (monthlyRate === 0) {
      monthlyPayment = principal / months;
    } else {
      const factor = Math.pow(1 + monthlyRate, months);
      monthlyPayment = principal * ((monthlyRate * factor) / (factor - 1));
    }

    const totalPayment = monthlyPayment * months;
    return {
      monthlyPayment: roundMoney(monthlyPayment),
      totalInterest: roundMoney(totalPayment - principal),
      totalPayment: roundMoney(totalPayment),
      months
    };
  }

  function calculateFlat(principal, annualRate, years) {
    const months = Math.round(years * 12);
    if (principal <= 0 || months <= 0) {
      return { monthlyPayment: 0, totalInterest: 0, totalPayment: 0, months };
    }

    const totalInterest = principal * (annualRate / 100) * years;
    const totalPayment = principal + totalInterest;
    return {
      monthlyPayment: roundMoney(totalPayment / months),
      totalInterest: roundMoney(totalInterest),
      totalPayment: roundMoney(totalPayment),
      months
    };
  }

  function buildAmortizationSchedule(principal, annualRate, years) {
    const months = Math.round(years * 12);
    const monthlyRate = annualRate / 100 / 12;
    const amortized = calculateAmortized(principal, annualRate, years);
    const schedule = [];
    let balance = principal;

    for (let year = 1; year <= years; year += 1) {
      const startBalance = balance;
      let yearlyPayment = 0;
      let yearlyPrincipal = 0;
      let yearlyInterest = 0;

      for (let month = 1; month <= 12 && ((year - 1) * 12 + month) <= months; month += 1) {
        const interest = monthlyRate === 0 ? 0 : balance * monthlyRate;
        let principalPaid = amortized.monthlyPayment - interest;

        if (principalPaid > balance || ((year - 1) * 12 + month) === months) {
          principalPaid = balance;
        }

        const payment = principalPaid + interest;
        balance = Math.max(0, balance - principalPaid);
        yearlyPayment += payment;
        yearlyPrincipal += principalPaid;
        yearlyInterest += interest;
      }

      schedule.push({
        year,
        startBalance: roundMoney(startBalance),
        yearlyPayment: roundMoney(yearlyPayment),
        yearlyPrincipal: roundMoney(yearlyPrincipal),
        yearlyInterest: roundMoney(yearlyInterest),
        endBalance: roundMoney(balance)
      });
    }

    return schedule;
  }

  function calculateEffectiveFlatRate(principal, totalPayment, months) {
    if (principal <= 0 || months <= 0 || totalPayment <= principal) return 0;
    const payment = totalPayment / months;
    let low = 0;
    let high = 1;

    for (let i = 0; i < 80; i += 1) {
      const mid = (low + high) / 2;
      const presentValue = payment * (1 - Math.pow(1 + mid, -months)) / mid;
      if (presentValue > principal) {
        low = mid;
      } else {
        high = mid;
      }
    }

    return roundMoney(((low + high) / 2) * 12 * 100);
  }

  function getElement(id) {
    return document.getElementById(id);
  }

  function setFieldValue(id, value, decimals) {
    const input = getElement(id);
    if (!input) return;
    input.value = Number.isFinite(value) ? formatPlainNumber(value, decimals) : '';
  }

  function getFieldValue(id) {
    const input = getElement(id);
    return input ? valueOrZero(input.value) : 0;
  }

  function setError(id, message) {
    const input = getElement(id);
    const error = document.querySelector(`[data-error-for="${id}"]`);
    if (input) input.classList.toggle('is-invalid', Boolean(message));
    if (error) error.textContent = message || '';
  }

  function clearErrors() {
    document.querySelectorAll('[data-error-for]').forEach((error) => {
      error.textContent = '';
    });
    document.querySelectorAll('.is-invalid').forEach((input) => {
      input.classList.remove('is-invalid');
    });
  }

  function populateYearOptions(type) {
    const meta = loanMeta[type];
    const select = getElement(`${type}-years`);
    if (!select) return;
    select.innerHTML = '';

    for (let year = meta.minYears; year <= meta.maxYears; year += 1) {
      const option = document.createElement('option');
      option.value = String(year);
      option.textContent = `${year} tahun`;
      if (year === meta.defaultYears) option.selected = true;
      select.appendChild(option);
    }
  }

  function syncDepositFromAmount(type) {
    if (state.syncLocked || type === 'personal') return;
    state.syncLocked = true;

    const price = getFieldValue(`${type}-price`);
    const deposit = getFieldValue(`${type}-deposit-rm`);
    const percent = price > 0 ? (deposit / price) * 100 : 0;
    const loanAmount = Math.max(0, price - deposit);

    setFieldValue(`${type}-deposit-percent`, percent, 2);
    setFieldValue(`${type}-loan-amount`, loanAmount, 2);
    state.syncLocked = false;
  }

  function syncDepositFromPercent(type) {
    if (state.syncLocked || type === 'personal') return;
    state.syncLocked = true;

    const price = getFieldValue(`${type}-price`);
    const percent = getFieldValue(`${type}-deposit-percent`);
    const deposit = price * (percent / 100);
    const loanAmount = Math.max(0, price - deposit);

    setFieldValue(`${type}-deposit-rm`, deposit, 2);
    setFieldValue(`${type}-loan-amount`, loanAmount, 2);
    state.syncLocked = false;
  }

  function syncDepositFromLoan(type) {
    if (state.syncLocked || type === 'personal') return;
    state.syncLocked = true;

    const price = getFieldValue(`${type}-price`);
    const loanAmount = getFieldValue(`${type}-loan-amount`);
    const deposit = Math.max(0, price - loanAmount);
    const percent = price > 0 ? (deposit / price) * 100 : 0;

    setFieldValue(`${type}-deposit-rm`, deposit, 2);
    setFieldValue(`${type}-deposit-percent`, percent, 2);
    state.syncLocked = false;
  }

  function collectInputs(type) {
    if (type === 'personal') {
      const selectedType = document.querySelector('input[name="personal-type"]:checked');
      return {
        type,
        principal: getFieldValue('personal-loan-amount'),
        annualRate: getFieldValue('personal-rate'),
        years: getFieldValue('personal-years'),
        calculationType: selectedType ? selectedType.value : 'flat'
      };
    }

    return {
      type,
      price: getFieldValue(`${type}-price`),
      deposit: getFieldValue(`${type}-deposit-rm`),
      depositPercent: getFieldValue(`${type}-deposit-percent`),
      principal: getFieldValue(`${type}-loan-amount`),
      annualRate: getFieldValue(`${type}-rate`),
      years: getFieldValue(`${type}-years`)
    };
  }

  function validateInputs(input) {
    const errors = [];
    const meta = loanMeta[input.type];

    if (input.type !== 'personal') {
      if (!Number.isFinite(input.price) || input.price <= 0) errors.push([`${input.type}-price`, 'Masukkan harga yang melebihi RM 0.']);
      if (!Number.isFinite(input.deposit) || input.deposit < 0) errors.push([`${input.type}-deposit-rm`, 'Deposit tidak boleh negatif.']);
      if (!Number.isFinite(input.depositPercent) || input.depositPercent < 0) errors.push([`${input.type}-deposit-percent`, 'Deposit peratus tidak boleh negatif.']);
      if (input.deposit > input.price) errors.push([`${input.type}-deposit-rm`, 'Deposit tidak boleh melebihi harga.']);
      if (!Number.isFinite(input.principal) || input.principal <= 0) errors.push([`${input.type}-loan-amount`, 'Jumlah pinjaman mesti melebihi RM 0.']);
      if (input.principal > input.price) errors.push([`${input.type}-loan-amount`, 'Jumlah pinjaman tidak boleh melebihi harga.']);
    } else if (!Number.isFinite(input.principal) || input.principal <= 0) {
      errors.push(['personal-loan-amount', 'Jumlah pinjaman mesti melebihi RM 0.']);
    }

    const rateId = input.type === 'personal' ? 'personal-rate' : `${input.type}-rate`;
    if (!Number.isFinite(input.annualRate) || input.annualRate < 0) errors.push([rateId, 'Kadar faedah tidak boleh negatif.']);
    if (input.annualRate > 30) errors.push([rateId, 'Semak kadar faedah. Nilai ini kelihatan terlalu tinggi.']);

    const yearsId = `${input.type}-years`;
    if (!Number.isFinite(input.years) || input.years <= 0) errors.push([yearsId, 'Pilih tempoh pinjaman.']);
    if (input.years < meta.minYears || input.years > meta.maxYears) {
      errors.push([yearsId, `Tempoh mesti antara ${meta.minYears} hingga ${meta.maxYears} tahun.`]);
    }

    const incomeRaw = getElement('monthly-income') ? getElement('monthly-income').value.trim() : '';
    const commitmentRaw = getElement('existing-commitment') ? getElement('existing-commitment').value.trim() : '';
    const income = parseNumber(incomeRaw);
    const commitment = parseNumber(commitmentRaw);

    if (incomeRaw !== '' && (!Number.isFinite(income) || income <= 0)) {
      errors.push(['monthly-income', 'Pendapatan mesti melebihi RM 0.']);
    }
    if (commitmentRaw !== '' && (!Number.isFinite(commitment) || commitment < 0)) {
      errors.push(['existing-commitment', 'Komitmen tidak boleh negatif.']);
    }

    return errors;
  }

  function calculateLoan(input, overrideYears) {
    const years = Number.isFinite(overrideYears) ? overrideYears : input.years;
    const principal = input.principal;
    const method = input.type === 'personal' ? input.calculationType : loanMeta[input.type].method;
    const base = method === 'reducing'
      ? calculateAmortized(principal, input.annualRate, years)
      : calculateFlat(principal, input.annualRate, years);

    const effectiveRate = method === 'flat'
      ? calculateEffectiveFlatRate(principal, base.totalPayment, base.months)
      : input.annualRate;

    return {
      ...base,
      type: input.type,
      price: input.price || principal,
      deposit: input.deposit || 0,
      principal,
      annualRate: input.annualRate,
      years,
      method,
      effectiveRate,
      annualCommitment: roundMoney(base.monthlyPayment * 12),
      interestToPrincipalRatio: principal > 0 ? roundMoney((base.totalInterest / principal) * 100) : 0,
      trueCost: roundMoney((input.price || principal) + base.totalInterest)
    };
  }

  function getDsrResult(monthlyPayment) {
    const incomeRaw = getElement('monthly-income') ? getElement('monthly-income').value.trim() : '';
    const commitmentRaw = getElement('existing-commitment') ? getElement('existing-commitment').value.trim() : '';
    const income = parseNumber(incomeRaw);
    const commitment = valueOrZero(commitmentRaw);

    if (incomeRaw === '' && commitmentRaw === '') return null;
    if (!Number.isFinite(income) || income <= 0) return null;

    const totalCommitment = commitment + monthlyPayment;
    const dsr = (totalCommitment / income) * 100;
    const balance = income - totalCommitment;
    let category = 'Rendah';
    let className = 'low';

    if (dsr > 60) {
      category = 'Sangat Tinggi';
      className = 'very-high';
    } else if (dsr >= 41) {
      category = 'Tinggi';
      className = 'high';
    } else if (dsr >= 30) {
      category = 'Sederhana';
      className = 'medium';
    }

    return {
      dsr: roundMoney(dsr),
      totalCommitment: roundMoney(totalCommitment),
      balance: roundMoney(balance),
      category,
      className
    };
  }

  function renderMetrics(result) {
    const metrics = [];

    if (result.type === 'home') {
      metrics.push(
        ['bi-bank', 'Jumlah pinjaman', formatMoney(result.principal)],
        ['bi-percent', 'Jumlah faedah', formatMoney(result.totalInterest)],
        ['bi-receipt', 'Jumlah keseluruhan bayaran', formatMoney(result.totalPayment)],
        ['bi-clock-history', 'Tempoh pinjaman', `${result.months} bulan`],
        ['bi-pie-chart', 'Nisbah faedah berbanding prinsipal', formatPercent(result.interestToPrincipalRatio)]
      );
    } else if (result.type === 'vehicle') {
      metrics.push(
        ['bi-cash-coin', 'Jumlah deposit', formatMoney(result.deposit)],
        ['bi-bank', 'Jumlah pinjaman', formatMoney(result.principal)],
        ['bi-percent', 'Jumlah faedah', formatMoney(result.totalInterest)],
        ['bi-receipt', 'Jumlah keseluruhan bayaran', formatMoney(result.totalPayment)],
        ['bi-car-front', 'Kos sebenar kenderaan termasuk faedah', formatMoney(result.trueCost)]
      );
    } else {
      metrics.push(
        ['bi-bank', 'Jumlah pinjaman', formatMoney(result.principal)],
        ['bi-percent', 'Jumlah faedah', formatMoney(result.totalInterest)],
        ['bi-receipt', 'Jumlah keseluruhan bayaran', formatMoney(result.totalPayment)],
        ['bi-calendar4-week', 'Jumlah komitmen tahunan', formatMoney(result.annualCommitment)],
        ['bi-activity', 'Kadar efektif anggaran', result.method === 'flat' ? formatPercent(result.effectiveRate) : 'Tidak berkaitan']
      );
    }

    const grid = getElement('result-grid');
    grid.innerHTML = metrics.map(([icon, label, value]) => `
      <article class="metric-card">
        <i class="bi ${icon}" aria-hidden="true"></i>
        <div>
          <span>${label}</span>
          <strong>${value}</strong>
        </div>
      </article>
    `).join('');
  }

  function renderChart(result) {
    const canvas = getElement('principal-interest-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    const data = [
      Math.max(0, roundMoney(result.principal)),
      Math.max(0, roundMoney(result.totalInterest))
    ];

    if (state.chart) {
      state.chart.data.datasets[0].data = data;
      state.chart.update();
      return;
    }

    state.chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Prinsipal', 'Faedah'],
        datasets: [{
          data,
          backgroundColor: ['#0f766e', '#2f6f9f'],
          borderColor: '#ffffff',
          borderWidth: 4,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              color: '#415160',
              font: {
                family: 'system-ui, -apple-system, Segoe UI, sans-serif'
              }
            }
          },
          tooltip: {
            callbacks: {
              label(context) {
                return `${context.label}: ${formatMoney(context.parsed)}`;
              }
            }
          }
        }
      }
    });
  }

  function renderDsr(result) {
    const dsr = getDsrResult(result.monthlyPayment);
    const category = getElement('dsr-category');
    const percent = getElement('dsr-percent');
    const total = getElement('dsr-total');
    const balance = getElement('dsr-balance');

    category.className = 'dsr-pill';

    if (!dsr) {
      category.textContent = 'Belum dikira';
      percent.textContent = '-';
      total.textContent = '-';
      balance.textContent = '-';
      return;
    }

    category.textContent = dsr.category;
    category.classList.add(dsr.className);
    percent.textContent = formatPercent(dsr.dsr);
    total.textContent = formatMoney(dsr.totalCommitment);
    balance.textContent = formatMoney(dsr.balance);
  }

  function renderComparison(input) {
    const tbody = document.querySelector('#comparison-table tbody');
    const years = loanMeta[input.type].comparisonYears.filter((year) => {
      const meta = loanMeta[input.type];
      return year >= meta.minYears && year <= meta.maxYears;
    });

    const rows = years.map((year) => {
      const result = calculateLoan(input, year);
      return {
        year,
        monthlyPayment: result.monthlyPayment,
        totalInterest: result.totalInterest,
        totalPayment: result.totalPayment
      };
    });

    const lowestPayment = Math.min(...rows.map((row) => row.monthlyPayment));
    const lowestInterest = Math.min(...rows.map((row) => row.totalInterest));

    tbody.innerHTML = rows.map((row) => {
      const tags = [];
      if (row.monthlyPayment === lowestPayment) tags.push('<span class="tag best-payment">Ansuran paling rendah</span>');
      if (row.totalInterest === lowestInterest) tags.push('<span class="tag best-interest">Faedah paling rendah</span>');

      return `
        <tr>
          <td><strong>${row.year} tahun</strong></td>
          <td>${formatMoney(row.monthlyPayment)}</td>
          <td>${formatMoney(row.totalInterest)}</td>
          <td>${formatMoney(row.totalPayment)}</td>
          <td>${tags.join(' ') || '-'}</td>
        </tr>
      `;
    }).join('');
  }

  function renderAmortization(input) {
    const section = getElement('amortization-section');
    const tbody = document.querySelector('#amortization-table tbody');
    if (input.type !== 'home') {
      section.style.display = 'none';
      tbody.innerHTML = '';
      return;
    }

    section.style.display = '';
    const schedule = buildAmortizationSchedule(input.principal, input.annualRate, input.years);
    tbody.innerHTML = schedule.map((row) => `
      <tr>
        <td><strong>${row.year}</strong></td>
        <td>${formatMoney(row.startBalance)}</td>
        <td>${formatMoney(row.yearlyPayment)}</td>
        <td>${formatMoney(row.yearlyPrincipal)}</td>
        <td>${formatMoney(row.yearlyInterest)}</td>
        <td>${formatMoney(row.endBalance)}</td>
      </tr>
    `).join('');
  }

  function updatePrintSummary(input, result) {
    const summary = getElement('print-summary-content');
    if (!summary) return;

    const rows = [
      ['Jenis pinjaman', loanMeta[input.type].title],
      ['Tarikh dan masa pengiraan', new Date().toLocaleString('ms-MY')],
      ['Jumlah pinjaman', formatMoney(result.principal)],
      ['Tempoh', `${result.years} tahun (${result.months} bulan)`],
      ['Kadar faedah', `${formatPercent(result.annualRate)} setahun`],
      ['Ansuran bulanan', formatMoney(result.monthlyPayment)],
      ['Jumlah faedah', formatMoney(result.totalInterest)],
      ['Jumlah bayaran', formatMoney(result.totalPayment)]
    ];

    if (input.type !== 'personal') {
      rows.splice(2, 0, ['Harga', formatMoney(input.price)], ['Deposit', formatMoney(input.deposit)]);
    } else {
      rows.splice(2, 0, ['Jenis pengiraan', result.method === 'flat' ? 'Kadar rata' : 'Baki berkurangan']);
    }

    summary.innerHTML = `
      <dl>
        ${rows.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}
      </dl>
      <p>Keputusan ini hanyalah anggaran. Aplikasi ini bukan penasihat kewangan dan tidak menjamin kelulusan pinjaman.</p>
    `;
  }

  function renderResults(input, result) {
    state.lastResult = { input, result };
    const now = new Date();

    getElement('form-title').textContent = loanMeta[input.type].title;
    getElement('result-title').textContent = loanMeta[input.type].summaryTitle;
    getElement('monthly-payment').textContent = formatMoney(result.monthlyPayment);
    getElement('result-subtitle').textContent = `${result.years} tahun pada kadar ${formatPercent(result.annualRate)} setahun.`;
    getElement('calculated-at').textContent = now.toLocaleString('ms-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    renderMetrics(result);
    renderChart(result);
    renderDsr(result);
    renderComparison(input);
    renderAmortization(input);
    updatePrintSummary(input, result);
  }

  function calculateAndRender() {
    clearErrors();
    const input = collectInputs(state.activeType);
    const errors = validateInputs(input);
    errors.forEach(([id, message]) => setError(id, message));

    if (errors.length > 0) {
      return false;
    }

    const result = calculateLoan(input);
    renderResults(input, result);
    return true;
  }

  function switchLoanType(type) {
    state.activeType = type;

    document.querySelectorAll('[data-loan-tab]').forEach((tab) => {
      const isActive = tab.dataset.loanTab === type;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-pressed', String(isActive));
    });

    document.querySelectorAll('[data-form-section]').forEach((section) => {
      section.classList.toggle('active', section.dataset.formSection === type);
    });

    const icon = getElement('active-loan-icon');
    const iconElement = icon.querySelector('i');
    if (iconElement) iconElement.className = `bi ${loanMeta[type].icon}`;
    calculateAndRender();
  }

  function resetCurrentForm() {
    const type = state.activeType;
    const defaults = loanMeta[type].defaultValues;

    if (type === 'personal') {
      setFieldValue('personal-loan-amount', defaults.loan, 2);
      setFieldValue('personal-rate', defaults.rate, 2);
      getElement('personal-years').value = String(defaults.years);
      getElement('personal-flat').checked = defaults.type === 'flat';
      getElement('personal-reducing').checked = defaults.type === 'reducing';
    } else {
      setFieldValue(`${type}-price`, defaults.price, 2);
      setFieldValue(`${type}-deposit-rm`, defaults.deposit, 2);
      setFieldValue(`${type}-deposit-percent`, (defaults.deposit / defaults.price) * 100, 2);
      setFieldValue(`${type}-loan-amount`, defaults.loan, 2);
      setFieldValue(`${type}-rate`, defaults.rate, 2);
      getElement(`${type}-years`).value = String(defaults.years);
    }

    getElement('monthly-income').value = '';
    getElement('existing-commitment').value = '';
    calculateAndRender();
  }

  function buildCopySummary() {
    if (!state.lastResult) calculateAndRender();
    const { input, result } = state.lastResult;
    const lines = [
      loanMeta[input.type].summaryTitle,
      '',
      `Jumlah Pinjaman: ${formatMoney(result.principal)}`,
      `Tempoh: ${result.years} tahun`,
      `Kadar Faedah: ${formatPercent(result.annualRate)} setahun`,
      `Ansuran Bulanan: ${formatMoney(result.monthlyPayment)}`,
      `Jumlah Faedah: ${formatMoney(result.totalInterest)}`,
      `Jumlah Bayaran: ${formatMoney(result.totalPayment)}`,
      '',
      'Keputusan ini hanyalah anggaran.'
    ];

    return lines.join('\n');
  }

  async function copySummary() {
    if (!calculateAndRender()) return;
    const text = buildCopySummary();

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }

      const toastElement = getElement('copy-toast');
      if (toastElement && window.bootstrap) {
        bootstrap.Toast.getOrCreateInstance(toastElement).show();
      }
    } catch (error) {
      setError(`${state.activeType === 'personal' ? 'personal' : state.activeType}-loan-amount`, 'Ringkasan tidak dapat disalin. Cuba semula.');
    }
  }

  function formatMoneyInputs() {
    document.querySelectorAll('[data-money-input]').forEach((input) => {
      const number = parseNumber(input.value);
      if (Number.isFinite(number)) input.value = formatPlainNumber(number, 2);
    });
  }

  function attachEvents() {
    document.querySelectorAll('[data-loan-tab]').forEach((button) => {
      button.addEventListener('click', () => switchLoanType(button.dataset.loanTab));
    });

    ['home', 'vehicle'].forEach((type) => {
      getElement(`${type}-price`).addEventListener('input', () => {
        syncDepositFromAmount(type);
        calculateAndRender();
      });
      getElement(`${type}-deposit-rm`).addEventListener('input', () => {
        syncDepositFromAmount(type);
        calculateAndRender();
      });
      getElement(`${type}-deposit-percent`).addEventListener('input', () => {
        syncDepositFromPercent(type);
        calculateAndRender();
      });
      getElement(`${type}-loan-amount`).addEventListener('input', () => {
        syncDepositFromLoan(type);
        calculateAndRender();
      });
      getElement(`${type}-rate`).addEventListener('input', calculateAndRender);
      getElement(`${type}-years`).addEventListener('change', calculateAndRender);
    });

    ['personal-loan-amount', 'personal-rate', 'personal-years', 'monthly-income', 'existing-commitment'].forEach((id) => {
      const element = getElement(id);
      const eventName = element.tagName === 'SELECT' ? 'change' : 'input';
      element.addEventListener(eventName, calculateAndRender);
    });

    document.querySelectorAll('input[name="personal-type"]').forEach((radio) => {
      radio.addEventListener('change', calculateAndRender);
    });

    document.querySelectorAll('[data-money-input]').forEach((input) => {
      input.addEventListener('blur', () => {
        const number = parseNumber(input.value);
        if (Number.isFinite(number)) input.value = formatPlainNumber(number, 2);
      });
      input.addEventListener('focus', () => {
        const number = parseNumber(input.value);
        if (Number.isFinite(number)) input.value = String(number);
      });
    });

    getElement('recalculate-btn').addEventListener('click', calculateAndRender);
    getElement('reset-btn').addEventListener('click', resetCurrentForm);
    getElement('print-btn').addEventListener('click', () => {
      if (calculateAndRender()) window.print();
    });
    getElement('copy-btn').addEventListener('click', copySummary);
  }

  function initialize() {
    Object.keys(loanMeta).forEach(populateYearOptions);
    formatMoneyInputs();
    attachEvents();
    calculateAndRender();
  }

  const api = {
    parseNumber,
    formatMoney,
    calculateAmortized,
    calculateFlat,
    buildAmortizationSchedule,
    calculateEffectiveFlatRate
  };

  if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', initialize);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
}());
