<div align="center">

# Loan Calculator Malaysia

**A simple, responsive loan calculator for everyday financial planning.**

Estimate monthly repayments, compare financing terms, and explore repayment breakdowns — directly in your browser.

[Portfolio](https://ariff.my) · [Source Code](https://github.com/ariffmy/loan-calculator)

</div>

---

## Overview

Loan Calculator Malaysia is a lightweight, browser-based application for estimating **housing, vehicle, and personal loan** repayments. Calculations run locally in the browser; no account, server-side processing, or database is required.

## Application Preview

![Loan Calculator Malaysia](docs/screenshot.png)

## Features

| Area | Capabilities |
| :--- | :--- |
| **Housing loans** | Reducing-balance repayment estimates and annual amortization schedule |
| **Vehicle loans** | Flat-rate repayment estimates |
| **Personal loans** | Flat-rate or reducing-balance calculation options |
| **Financial overview** | Monthly instalment, principal, interest, total repayment, and estimated debt service ratio (DSR) |
| **Visual insights** | Chart.js principal/interest breakdown and loan-term comparison |
| **Usability** | Responsive layout, inline validation, reset, print, and copy-summary actions |

## Technology

`HTML` · `CSS` · `JavaScript` · `Bootstrap` · `Chart.js`

No build tools or database are needed.

## Getting Started

1. Clone or download this repository.
2. Open `index.html` in a modern browser.
3. Select a loan type, enter the financing details, and calculate.

For conventional static hosting or cPanel, upload the repository files while preserving the directory structure.

```text
loan-calculator/
├── index.html
├── assets/
│   ├── css/style.css
│   └── js/app.js
└── README.md
```

## Calculation Methods

**Reducing balance (amortized repayment)**

```text
M = P × [r(1 + r)^n] / [(1 + r)^n − 1]
```

Where `M` is the monthly repayment, `P` is the principal, `r` is the monthly interest rate, and `n` is the number of monthly payments. At a zero interest rate, monthly repayment is `P / n`.

**Flat rate**

```text
Total interest = Principal × Annual rate × Years
Monthly repayment = (Principal + Total interest) / Months
```

Actual bank calculations, financing products, and rounding policies may differ.

## Customization

- **Default input values:** Edit the `loanMeta` configuration in `assets/js/app.js`.
- **Theme:** Adjust CSS custom properties in `assets/css/style.css`.
- **Hosting:** Deploy as static files; adjust asset paths if embedding within another website.

## Privacy

Loan inputs and calculations are handled in the browser. This application does not require a database or send entered loan details to an application backend. Third-party frontend dependencies may still be loaded according to the page's configured asset URLs.

## Disclaimer

All results are **estimates for informational purposes only**, not financial advice or a loan approval decision. Actual interest/profit rates, charges, insurance/takaful, stamp duty, and repayment amounts depend on the financing institution and product terms.

---

<div align="center">
  <sub>Built by <a href="https://ariff.my">ariff.my</a> · Design with purpose. Build with simplicity.</sub>
</div>
