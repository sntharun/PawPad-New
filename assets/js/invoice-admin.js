/* Invoice register inside the existing admin panel. All authorization is enforced by the API. */
(function (window) {
  const e = React.createElement;
  const { useState, useEffect } = React;
  const services = ["course", "grooming", "boarding", "consulting", "other"];
  const blank = () => ({ id: 0, status: "draft", customerName: "", customerEmail: "", customerAddress: "", customerStateCode: "", customerStateName: "", deliveryAddress: "", customerGstin: "", notes: "", items: [{ service: "grooming", description: "", quantity: 1, unitPrice: "" }], links: [] });
  const emptySettings = () => ({ legalName: "", address: "", stateCode: "", stateName: "", gstStatus: "unknown", eInvoiceStatus: "unknown", gstin: "", invoicePrefix: "PP", authorizedSignatory: "", signatureData: "", approvedAt: "", adjustmentsApprovedAt: "", serviceCodes: Object.fromEntries(services.map((service) => [service, { code: "", rate: "" }])) });

  function Field({ label, value, onChange, type, options, multiline, min, step, disabled }) {
    const props = { className: "input-field", value: value == null ? "" : value, disabled, onChange: (event) => onChange(event.target.value) };
    const control = options ? e("select", props, options.map(([value, title]) => e("option", { key: value, value }, title))) : multiline ? e("textarea", { ...props, rows: 3 }) : e("input", { ...props, type: type || "text", min, step });
    return e("label", { className: "phase2-field" }, label, control);
  }

  function InvoiceAdminTab({ canAdmin }) {
    const [sales, setSales] = useState([]);
    const [invoicePage, setInvoicePage] = useState(0);
    const [saleTotal, setSaleTotal] = useState(0);
    const [sources, setSources] = useState([]);
    const [sale, setSale] = useState(blank);
    const [settings, setSettings] = useState(emptySettings);
    const [savedSettings, setSavedSettings] = useState(emptySettings);
    const [view, setView] = useState("register");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [sourceChoice, setSourceChoice] = useState("");
    const [confirmedCustomer, setConfirmedCustomer] = useState(false);
    const [confirmedAmount, setConfirmedAmount] = useState(false);
    const [confirmedNoReverseCharge, setConfirmedNoReverseCharge] = useState(false);
    const [accountantConfirmed, setAccountantConfirmed] = useState(false);
    const [adjustmentsConfirmed, setAdjustmentsConfirmed] = useState(false);
    const [accountantName, setAccountantName] = useState("");
    const [accountantReference, setAccountantReference] = useState("");
    const [correctionNote, setCorrectionNote] = useState("");
    const [deliveryEmail, setDeliveryEmail] = useState("");
    const [noteDraft, setNoteDraft] = useState(null);
    const [noteConfirmed, setNoteConfirmed] = useState(false);
    const [noteAccountantConfirmed, setNoteAccountantConfirmed] = useState(false);
    const [notePreview, setNotePreview] = useState(null);
    const [refundDraft, setRefundDraft] = useState(null);
    const [collectionDraft, setCollectionDraft] = useState(null);

    const run = async (action, payload) => {
      const result = await window.PawpadApi.call(action, payload || {});
      if (!result.ok) throw new Error((result.data && result.data.error) || `${action} failed. Check the API connection.`);
      return result.data;
    };
    const refresh = async (selectedId, page = invoicePage) => {
      const [list, available] = await Promise.all([run("list_invoice_sales", { page }), run("list_invoice_sources")]);
      setSales(list.sales || []); setSaleTotal(list.total || 0); setSources(available.sources || []);
      if (selectedId) {
        const selectedSale = (list.sales || []).find((row) => row.id === selectedId) || (await run("get_invoice_sale", { id: selectedId })).sale;
        setSale(selectedSale); setDeliveryEmail(selectedSale.customerEmail || "");
      }
    };
    useEffect(() => {
      refresh().catch((err) => setError(err.message));
      if (canAdmin) run("get_invoice_settings").then((data) => {
        const current = { ...emptySettings(), ...data.settings };
        setSettings(current); setSavedSettings(current);
      }).catch((err) => setError(err.message));
    }, [canAdmin]);
    const change = (key, value) => setSale((previous) => ({ ...previous, [key]: value }));
    const itemChange = (index, key, value) => setSale((previous) => ({ ...previous, items: previous.items.map((row, at) => at === index ? { ...row, [key]: value } : row) }));
    const doAction = async (action, payload, message) => {
      if (busy) return;
      setBusy(true); setError(""); setNotice("");
      try {
        const result = await run(action, payload);
        if (result.sale) await refresh(result.sale.id);
        if (result.settings) { const current = { ...emptySettings(), ...result.settings }; setSettings(current); setSavedSettings(current); }
        setNotice(message || "Saved.");
        return result;
      } catch (err) { setError(err.message); }
      finally { setBusy(false); }
      return null;
    };
    const save = () => doAction("save_invoice_sale", sale, "Draft sale saved.");
    const issue = async () => {
      if (busy) return;
      setBusy(true); setError(""); setNotice("");
      try {
        const saved = await run("save_invoice_sale", sale);
        const issued = await run("issue_invoice", { id: saved.sale.id, customerConfirmed: confirmedCustomer, finalAmountConfirmed: confirmedAmount, reverseChargeConfirmed: confirmedNoReverseCharge });
        await refresh(issued.sale.id);
        setNotice(`Invoice ${issued.sale.issuedNo} issued. ${issued.sale.emailStatus === "sent" ? "Email sent." : "Check email status; you can retry delivery."}`);
      } catch (err) { setError(err.message); }
      finally { setBusy(false); }
    };
    const download = async (noteId = 0) => {
      setError("");
      try {
        const data = await run(noteId ? "get_invoice_adjustment_pdf" : "get_invoice_pdf", { id: noteId || sale.id });
        const bytes = Uint8Array.from(atob(data.base64), (character) => character.charCodeAt(0));
        const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
        const link = document.createElement("a"); link.href = url; link.download = data.filename; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } catch (err) { setError(err.message); }
    };
    const selected = sources.find((source) => `${source.kind}:${source.id}` === sourceChoice);
    const canEdit = sale.status !== "issued";
    const settingsChanged = JSON.stringify(settings) !== JSON.stringify(savedSettings);
    const amount = (sale.items || []).reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
    const paid = (sale.links || []).reduce((sum, link) => sum + Number(link.amount || 0), 0);
    const originalPaid = (sale.snapshot?.payments || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const originalModes = [...new Set((sale.snapshot?.payments || []).map((payment) => payment.mode).filter(Boolean))];
    const originalLines = sale.snapshot?.calculation?.items || [];
    const issuedNotes = (sale.adjustments || []).filter((note) => note.status === "issued");
    const adjustedTotal = Number(sale.snapshot?.calculation?.total || 0) + issuedNotes.reduce((sum, note) => sum + (note.kind === "credit" ? -1 : 1) * Number(note.snapshot?.calculation?.total || 0), 0);
    const refundsPaid = issuedNotes.reduce((sum, note) => sum + (note.refunds || []).reduce((part, row) => part + Number(row.amount), 0), 0);
    const extraCollected = issuedNotes.reduce((sum, note) => sum + (note.collections || []).reduce((part, row) => part + Number(row.amount), 0), 0);
    const balanceDue = adjustedTotal - originalPaid - extraCollected + refundsPaid;
    const newNote = () => ({ id: 0, saleId: sale.id, kind: "credit", reason: "", reviewReference: "", lines: originalLines.map((_, lineIndex) => ({ lineIndex, amount: "" })) });
    const changeNote = (key, value) => { setNotePreview(null); setNoteConfirmed(false); setNoteAccountantConfirmed(false); setNoteDraft((current) => ({ ...current, [key]: value })); };
    const savedNote = (sale.adjustments || []).find((note) => note.id === noteDraft?.id);
    const normalizeNoteLines = (rows) => JSON.stringify((rows || []).filter((row) => Number(row.amount) > 0).map((row) => [Number(row.lineIndex), Number(row.amount)]).sort((a, b) => a[0] - b[0]));
    const noteIsSaved = savedNote && savedNote.kind === noteDraft?.kind && savedNote.reason === noteDraft?.reason && savedNote.reviewReference === noteDraft?.reviewReference && normalizeNoteLines(savedNote.lines) === normalizeNoteLines(noteDraft?.lines);
    const saveNote = async () => {
      const lines = (noteDraft.lines || []).filter((line) => Number(line.amount) > 0);
      const result = await doAction("save_invoice_adjustment", { ...noteDraft, lines }, "Draft note saved. Review it before issuing.");
      if (result) { setNoteDraft(result.adjustment); setNotePreview(null); setNoteConfirmed(false); setNoteAccountantConfirmed(false); }
    };
    const issueNote = async () => {
      const result = await doAction("issue_invoice_adjustment", { id: noteDraft.id, detailsConfirmed: noteConfirmed, accountantReviewConfirmed: noteAccountantConfirmed }, "Numbered note issued. Check its email status below.");
      if (result) { setNoteDraft(null); setNotePreview(null); setNoteConfirmed(false); setNoteAccountantConfirmed(false); }
    };

    return e("div", { className: "phase2-form" },
      e("div", { className: "phase2-row" },
        e("button", { type: "button", className: `btn-admin ${view === "register" ? "btn-admin-primary" : "btn-admin-secondary"}`, onClick: () => setView("register") }, "Invoice register"),
        canAdmin && e("button", { type: "button", className: `btn-admin ${view === "settings" ? "btn-admin-primary" : "btn-admin-secondary"}`, onClick: () => setView("settings") }, "Billing settings")),
      error && e("p", { role: "alert", style: { color: "var(--admin-danger)" } }, error),
      notice && e("p", { role: "status", style: { color: "var(--admin-success)" } }, notice),
      view === "settings" && canAdmin ? e("div", { className: "card phase2-form" },
        e("h2", null, "Accountant-approved billing setup"),
        e("p", null, settings.approvedAt ? `Approved ${settings.approvedAt} by ${settings.approvedBy}. Financial notes: ${settings.adjustmentsApprovedAt ? "approved" : "locked"}. Any edit locks issuance until it is approved again.` : "Issuance is locked until these details are approved."),
        e(Field, { label: "Legal issuer name", value: settings.legalName, onChange: (value) => setSettings({ ...settings, legalName: value }) }),
        e(Field, { label: "Registered address", value: settings.address, multiline: true, onChange: (value) => setSettings({ ...settings, address: value }) }),
        e("div", { className: "phase2-row" },
          e(Field, { label: "Issuer state code (two digits)", value: settings.stateCode, onChange: (value) => setSettings({ ...settings, stateCode: value }) }),
          e(Field, { label: "Issuer state name", value: settings.stateName, onChange: (value) => setSettings({ ...settings, stateName: value }) }),
          e(Field, { label: "GST status", value: settings.gstStatus, options: [["unknown", "Select"], ["registered", "Registered"], ["unregistered", "Unregistered"]], onChange: (value) => setSettings({ ...settings, gstStatus: value }) }),
          e(Field, { label: "GST e-invoicing applies to this issuer? (accountant to confirm)", value: settings.eInvoiceStatus, options: [["unknown", "Awaiting review"], ["not_applicable", "Does not apply"], ["applicable", "Applies — block B2B until IRP integration"]], onChange: (value) => setSettings({ ...settings, eInvoiceStatus: value }) }),
          e(Field, { label: "GSTIN (if registered)", value: settings.gstin, onChange: (value) => setSettings({ ...settings, gstin: value }) }),
          e(Field, { label: "Invoice number prefix", value: settings.invoicePrefix, onChange: (value) => setSettings({ ...settings, invoicePrefix: value }) })),
        e(Field, { label: "Authorized signatory name", value: settings.authorizedSignatory, onChange: (value) => setSettings({ ...settings, authorizedSignatory: value }) }),
        e("label", { className: "phase2-field" }, "Authorized signature image (PNG/JPEG under 100 KB)",
          e("input", { type: "file", accept: "image/png,image/jpeg", onChange: (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            if (!["image/png", "image/jpeg"].includes(file.type) || file.size > 100000) { setError("Choose a PNG or JPEG signature image under 100 KB."); return; }
            const reader = new FileReader(); reader.onload = () => setSettings((current) => ({ ...current, signatureData: String(reader.result || "") })); reader.readAsDataURL(file);
          } }), settings.signatureData && e("span", null, "Signature image loaded (stored privately in billing settings).")),
        e("h3", null, "Approved service codes and GST rates"),
        services.map((service) => e("div", { key: service, className: "phase2-row phase2-panel" },
          e("strong", null, service),
          e(Field, { label: "SAC / service code", value: settings.serviceCodes[service]?.code || "", onChange: (value) => setSettings({ ...settings, serviceCodes: { ...settings.serviceCodes, [service]: { ...settings.serviceCodes[service], code: value } } }) }),
          e(Field, { label: "GST rate %", value: settings.serviceCodes[service]?.rate ?? "", type: "number", min: "0", step: "0.01", onChange: (value) => setSettings({ ...settings, serviceCodes: { ...settings.serviceCodes, [service]: { ...settings.serviceCodes[service], rate: value } } }) }))),
        e("button", { className: "btn-admin btn-admin-primary", disabled: busy, onClick: () => doAction("save_invoice_settings", settings, "Billing settings saved. Issuance remains locked until approval.") }, "Save billing settings"),
        e(Field, { label: "Approving accountant name", value: accountantName, onChange: setAccountantName }),
        e(Field, { label: "Approval reference (email or document ID)", value: accountantReference, onChange: setAccountantReference }),
        e("label", null, e("input", { type: "checkbox", checked: accountantConfirmed, onChange: (event) => setAccountantConfirmed(event.target.checked) }), " I confirm an accountant approved the issuer details, GST and e-invoicing treatment, codes, rates, and numbering."),
        e("label", null, e("input", { type: "checkbox", checked: adjustmentsConfirmed, onChange: (event) => setAdjustmentsConfirmed(event.target.checked) }), " The accountant also approved domestic credit/debit notes and their CN/DN numbering. Leave unchecked until confirmed."),
        e("button", { className: "btn-admin btn-admin-secondary", disabled: busy || settingsChanged || !accountantConfirmed || !accountantName.trim() || !accountantReference.trim(), title: settingsChanged ? "Save billing settings before approving" : "", onClick: () => doAction("approve_invoice_settings", { accountantConfirmed: true, adjustmentsConfirmed, accountantName, accountantReference }, "Billing settings approved. Check whether financial notes were also approved.") }, "Approve settings")) :
      e("div", { className: "phase2-grid" },
        e("aside", { className: "card phase2-form" },
          e("h2", null, "Sales"),
          e("button", { className: "btn-admin btn-admin-primary", onClick: () => { setSale(blank()); setNoteDraft(null); setRefundDraft(null); setCollectionDraft(null); setDeliveryEmail(""); setConfirmedCustomer(false); setConfirmedAmount(false); setConfirmedNoReverseCharge(false); setError(""); } }, "+ New sale"),
          sales.map((row) => e("button", { key: row.id, className: `btn-admin ${sale.id === row.id ? "btn-admin-primary" : "btn-admin-secondary"}`, style: { whiteSpace: "normal", textAlign: "left" }, onClick: () => { setSale(row); setNoteDraft(null); setRefundDraft(null); setCollectionDraft(null); setDeliveryEmail(row.customerEmail || ""); setConfirmedCustomer(false); setConfirmedAmount(false); setConfirmedNoReverseCharge(false); setError(""); } }, `${row.customerName || "Unnamed"} · ${row.issuedNo || "Draft #" + row.id}`)),
          e("div", { className: "phase2-row" },
            e("button", { className: "btn-admin btn-admin-secondary", disabled: invoicePage === 0, onClick: () => { const next = invoicePage - 1; setInvoicePage(next); refresh(null, next).catch((err) => setError(err.message)); } }, "Previous"),
            e("span", { style: { fontSize: 12, textAlign: "center" } }, `${saleTotal} sales · page ${invoicePage + 1}`),
            e("button", { className: "btn-admin btn-admin-secondary", disabled: (invoicePage + 1) * 50 >= saleTotal, onClick: () => { const next = invoicePage + 1; setInvoicePage(next); refresh(null, next).catch((err) => setError(err.message)); } }, "Next"))),
        e("section", { className: "card phase2-form" },
          e("h2", null, sale.status === "issued" ? `Invoice ${sale.issuedNo}` : sale.id ? `Draft sale #${sale.id}` : "New sale"),
          e("p", null, sale.status === "issued" ? `Issued ${sale.issuedAt}. Email: ${sale.emailStatus}${sale.emailError ? ` (${sale.emailError})` : ""}.` : "Confirm the customer and final amount after linking verified payments. Drafts can be edited."),
          e("div", { className: "phase2-row" },
            e(Field, { label: "Customer name", value: sale.customerName, disabled: !canEdit, onChange: (value) => change("customerName", value) }),
            e(Field, { label: "Email for invoice delivery", value: sale.customerEmail, type: "email", disabled: !canEdit, onChange: (value) => change("customerEmail", value) })),
          e(Field, { label: "Customer billing address", value: sale.customerAddress, multiline: true, disabled: !canEdit, onChange: (value) => change("customerAddress", value) }),
          e(Field, { label: "Delivery address (leave blank if same as billing)", value: sale.deliveryAddress, multiline: true, disabled: !canEdit, onChange: (value) => change("deliveryAddress", value) }),
          e("div", { className: "phase2-row" },
            e(Field, { label: "Customer state code", value: sale.customerStateCode, disabled: !canEdit, onChange: (value) => change("customerStateCode", value) }),
            e(Field, { label: "Customer state name", value: sale.customerStateName, disabled: !canEdit, onChange: (value) => change("customerStateName", value) }),
            e(Field, { label: "Customer GSTIN (if supplied)", value: sale.customerGstin, disabled: !canEdit, onChange: (value) => change("customerGstin", value) })),
          e("h3", null, "Services and final price"),
          (sale.items || []).map((item, index) => e("div", { key: index, className: "phase2-panel phase2-form" },
            e("div", { className: "phase2-row" },
              e(Field, { label: "Service", value: item.service, disabled: !canEdit, options: services.map((service) => [service, service]), onChange: (value) => itemChange(index, "service", value) }),
              e(Field, { label: "Description", value: item.description, disabled: !canEdit, onChange: (value) => itemChange(index, "description", value) })),
            e("div", { className: "phase2-row" },
              e(Field, { label: "Quantity", value: item.quantity, disabled: !canEdit, type: "number", min: "0.01", step: "0.01", onChange: (value) => itemChange(index, "quantity", value) }),
              e(Field, { label: "Final unit price ₹ (inclusive of tax)", value: item.unitPrice, disabled: !canEdit, type: "number", min: "0.01", step: "0.01", onChange: (value) => itemChange(index, "unitPrice", value) }),
              canEdit && e("button", { className: "btn-admin btn-admin-secondary", onClick: () => change("items", sale.items.filter((_, at) => at !== index)) }, "Remove item")))),
          canEdit && e("button", { className: "btn-admin btn-admin-secondary", onClick: () => change("items", [...sale.items, { service: "other", description: "", quantity: 1, unitPrice: "" }]) }, "+ Add item"),
          e("h3", null, "Linked records and payments"),
          (sale.links || []).map((link, index) => e("div", { key: index, className: "phase2-row phase2-panel" },
            e("span", null, `${link.kind}${link.id ? " #" + link.id : ""} · ₹${link.amount == null ? "no payment" : Number(link.amount).toFixed(2)} · ${link.reference || ""}`),
            canEdit && e("button", { className: "btn-admin btn-admin-secondary", onClick: () => change("links", sale.links.filter((_, at) => at !== index)) }, "Remove"))),
          canEdit && e("div", { className: "phase2-row" },
            e("select", { className: "input-field", value: sourceChoice, onChange: (event) => setSourceChoice(event.target.value) },
              e("option", { value: "" }, "Select a course payment, grooming closing, or boarding request"),
              sources.filter((source) => !(sale.links || []).some((link) => link.kind === source.kind && link.id === source.id)).map((source) => e("option", { key: `${source.kind}:${source.id}`, value: `${source.kind}:${source.id}` }, `${source.kind} #${source.id} · ${source.customerName} · ${source.label} · ${source.amount == null ? "payment not recorded" : "₹" + source.amount}`))),
            e("button", { className: "btn-admin btn-admin-secondary", disabled: !selected, onClick: () => { if (selected) change("links", [...sale.links, selected]); setSourceChoice(""); } }, "+ Link record")),
          canEdit && e("button", { className: "btn-admin btn-admin-secondary", onClick: () => change("links", [...sale.links, { kind: "manual", amount: "", paidOn: new Date().toISOString().slice(0, 10), mode: "upi", reference: "" }]) }, "+ Record other verified payment"),
          canEdit && (sale.links || []).map((link, index) => link.kind === "manual" && e("div", { key: `manual-${index}`, className: "phase2-row phase2-panel" },
            e(Field, { label: "Paid amount ₹", value: link.amount, type: "number", min: "0.01", step: "0.01", onChange: (value) => change("links", sale.links.map((row, at) => at === index ? { ...row, amount: value } : row)) }),
            e(Field, { label: "Paid on", value: link.paidOn, type: "date", onChange: (value) => change("links", sale.links.map((row, at) => at === index ? { ...row, paidOn: value } : row)) }),
            e(Field, { label: "Mode", value: link.mode, options: [["upi", "UPI"], ["cash", "Cash"], ["card", "Card"], ["bank_transfer", "Bank transfer"]], onChange: (value) => change("links", sale.links.map((row, at) => at === index ? { ...row, mode: value } : row)) }),
            e(Field, { label: "Transaction / receipt reference", value: link.reference, onChange: (value) => change("links", sale.links.map((row, at) => at === index ? { ...row, reference: value } : row)) }))),
          e("p", { style: { fontWeight: 600 } }, `Final amount ₹${amount.toFixed(2)} · Linked payments ₹${paid.toFixed(2)}`),
          e(Field, { label: "Invoice notes", value: sale.notes, multiline: true, disabled: !canEdit, onChange: (value) => change("notes", value) }),
          canEdit && e("button", { className: "btn-admin btn-admin-primary", disabled: busy, onClick: save }, "Save draft sale"),
          canEdit && sale.id > 0 && e("div", { className: "phase2-panel phase2-form" },
            e("label", null, e("input", { type: "checkbox", checked: confirmedCustomer, onChange: (event) => setConfirmedCustomer(event.target.checked) }), " I verified the customer and billing identity."),
            e("label", null, e("input", { type: "checkbox", checked: confirmedAmount, onChange: (event) => setConfirmedAmount(event.target.checked) }), " I verified the final amount and all linked payments."),
            e("label", null, e("input", { type: "checkbox", checked: confirmedNoReverseCharge, onChange: (event) => setConfirmedNoReverseCharge(event.target.checked) }), " I verified reverse charge does not apply to this sale."),
            e("button", { className: "btn-admin btn-admin-primary", disabled: busy || !confirmedCustomer || !confirmedAmount || !confirmedNoReverseCharge, onClick: issue }, "Issue numbered invoice")),
          sale.status === "issued" && e("div", { className: "phase2-row" },
            e("button", { className: "btn-admin btn-admin-primary", onClick: () => download() }, "Download PDF"),
            sale.customerEmail && e("button", { className: "btn-admin btn-admin-secondary", disabled: busy, onClick: () => doAction("send_invoice", { id: sale.id }, "Email attempt recorded. Check status above.") }, sale.emailStatus === "sent" ? "Resend email" : "Send / retry email")),
          sale.status === "issued" && e("div", { className: "phase2-panel phase2-form" },
            e("h3", null, "Amount changes and refunds"),
            e("p", null, `Original invoice ₹${Number(sale.snapshot?.calculation?.total || 0).toFixed(2)} · Net after issued notes ₹${adjustedTotal.toFixed(2)} · ${balanceDue >= 0 ? "Still payable" : "Refund remaining"} ₹${Math.abs(balanceDue).toFixed(2)}. The original invoice remains unchanged.`),
            (sale.adjustments || []).map((note) => e("div", { key: note.id, className: "phase2-panel phase2-form" },
              e("strong", null, `${note.kind === "credit" ? "Credit" : "Debit"} note ${note.number || "draft #" + note.id}`),
              e("p", null, `${note.reason} · ${note.status === "issued" ? `₹${Number(note.snapshot?.calculation?.total || 0).toFixed(2)}` : "Draft"}${note.status === "issued" ? ` · Email: ${note.emailStatus}` : ""}`),
              note.status === "issued" && e("div", { className: "phase2-row" },
                e("button", { className: "btn-admin btn-admin-secondary", onClick: () => download(note.id) }, "Download note PDF"),
                canAdmin && sale.customerEmail && e("button", { className: "btn-admin btn-admin-secondary", disabled: busy, onClick: () => doAction("send_invoice_adjustment", { id: note.id }, "Note email attempt recorded.") }, "Send / retry note email")),
              note.status === "draft" && canAdmin && e("button", { className: "btn-admin btn-admin-secondary", onClick: () => { setNoteDraft(note); setNotePreview(null); setNoteConfirmed(false); setNoteAccountantConfirmed(false); } }, "Edit draft note"),
              note.kind === "credit" && note.status === "issued" && e("div", null,
                e("p", null, `Refunds recorded: ₹${(note.refunds || []).reduce((sum, row) => sum + Number(row.amount), 0).toFixed(2)}. A credit note alone does not confirm a payout.`),
                (note.refunds || []).map((row, index) => e("p", { key: index }, `${row.refundedOn} · ₹${Number(row.amount).toFixed(2)} · ${row.mode} · ${row.reference}`)),
                canAdmin && e("button", { className: "btn-admin btn-admin-secondary", onClick: () => setRefundDraft({ id: note.id, amount: "", refundedOn: new Date().toISOString().slice(0, 10), mode: originalModes[0] || "", reference: "" }) }, "Record completed refund")),
              note.kind === "debit" && note.status === "issued" && e("div", null,
                e("p", null, `Additional payments recorded: ₹${(note.collections || []).reduce((sum, row) => sum + Number(row.amount), 0).toFixed(2)}.`),
                (note.collections || []).map((row, index) => e("p", { key: index }, `${row.receivedOn} · ₹${Number(row.amount).toFixed(2)} · ${row.mode} · ${row.reference}`)),
                canAdmin && e("button", { className: "btn-admin btn-admin-secondary", onClick: () => setCollectionDraft({ id: note.id, amount: "", receivedOn: new Date().toISOString().slice(0, 10), mode: "upi", reference: "" }) }, "Record additional payment")))),
            canAdmin && e("button", { className: "btn-admin btn-admin-secondary", onClick: () => { setNoteDraft(newNote()); setNotePreview(null); setNoteConfirmed(false); setNoteAccountantConfirmed(false); } }, "+ Draft credit or debit note"),
            canAdmin && noteDraft && noteDraft.saleId === sale.id && e("div", { className: "phase2-panel phase2-form" },
              e("h4", null, noteDraft.id ? `Draft note #${noteDraft.id}` : "New draft note"),
              e(Field, { label: "Document type", value: noteDraft.kind, options: [["credit", "Credit: decrease customer charge"], ["debit", "Debit: increase customer charge"]], onChange: (value) => changeNote("kind", value) }),
              e(Field, { label: "Why is the amount changing?", value: noteDraft.reason, multiline: true, onChange: (value) => changeNote("reason", value) }),
              e(Field, { label: "Accountant review reference for this note", value: noteDraft.reviewReference, onChange: (value) => changeNote("reviewReference", value) }),
              originalLines.map((line, lineIndex) => e(Field, { key: lineIndex, label: `Original line ${lineIndex + 1}: ${line.description} · ₹${line.gross}. Change amount ₹`, value: noteDraft.lines.find((row) => Number(row.lineIndex) === lineIndex)?.amount || "", type: "number", min: "0", step: "0.01", onChange: (value) => changeNote("lines", [...noteDraft.lines.filter((row) => Number(row.lineIndex) !== lineIndex), { lineIndex, amount: value }]) })),
              e("p", null, "Choose the amount to add or remove on each original line. Credit notes cannot exceed the uncredited amount. A refund is recorded separately after the money is sent."),
              e("div", { className: "phase2-row" },
                e("button", { className: "btn-admin btn-admin-secondary", disabled: busy, onClick: saveNote }, "Save draft note"),
                e("button", { className: "btn-admin btn-admin-secondary", onClick: () => setNoteDraft(null) }, "Close draft editor")),
              noteDraft.id > 0 && e("div", { className: "phase2-form" },
                e("button", { className: "btn-admin btn-admin-secondary", disabled: busy || !noteIsSaved, onClick: async () => { try { const result = await run("preview_invoice_adjustment", { id: noteDraft.id }); setNotePreview(result.calculation); setError(""); } catch (err) { setError(err.message); } } }, "Preview note totals"),
                notePreview && e("p", null, `Preview: value ₹${notePreview.net} · CGST ₹${notePreview.cgst} · SGST ₹${notePreview.sgst} · IGST ₹${notePreview.igst} · total ₹${notePreview.total}`),
                e("label", null, e("input", { type: "checkbox", checked: noteConfirmed, onChange: (event) => setNoteConfirmed(event.target.checked) }), " I reviewed the saved draft reason, changed lines, amount, and accountant approval."),
                e("label", null, e("input", { type: "checkbox", checked: noteAccountantConfirmed, onChange: (event) => setNoteAccountantConfirmed(event.target.checked) }), " I verified the accountant review reference and tax treatment for this note."),
                e("button", { className: "btn-admin btn-admin-primary", disabled: busy || !notePreview || !noteConfirmed || !noteAccountantConfirmed || !noteIsSaved || !noteDraft.reviewReference?.trim(), title: !noteIsSaved ? "Save draft changes before issuing" : "", onClick: issueNote }, "Issue numbered note"))),
            canAdmin && refundDraft && e("div", { className: "phase2-panel phase2-form" },
              e("h4", null, `Completed refund for credit note #${refundDraft.id}`),
              e(Field, { label: "Amount paid back ₹", value: refundDraft.amount, type: "number", min: "0.01", step: "0.01", onChange: (value) => setRefundDraft({ ...refundDraft, amount: value }) }),
              e(Field, { label: "Refund date", value: refundDraft.refundedOn, type: "date", onChange: (value) => setRefundDraft({ ...refundDraft, refundedOn: value }) }),
              e(Field, { label: "Refund mode (original payment method)", value: refundDraft.mode, options: originalModes.map((mode) => [mode, { upi: "UPI", cash: "Cash", card: "Card", bank_transfer: "Bank transfer" }[mode] || mode]), onChange: (value) => setRefundDraft({ ...refundDraft, mode: value }) }),
              e(Field, { label: "Refund transaction reference", value: refundDraft.reference, onChange: (value) => setRefundDraft({ ...refundDraft, reference: value }) }),
              e("label", null, e("input", { type: "checkbox", checked: refundDraft.payoutConfirmed || false, onChange: (event) => setRefundDraft({ ...refundDraft, payoutConfirmed: event.target.checked }) }), " I verified that this refund was paid to the customer."),
              e("button", { className: "btn-admin btn-admin-primary", disabled: busy || !refundDraft.amount || !refundDraft.reference.trim() || !refundDraft.payoutConfirmed, onClick: async () => { const result = await doAction("record_invoice_refund", refundDraft, "Completed refund recorded."); if (result) setRefundDraft(null); } }, "Record refund")),
            canAdmin && collectionDraft && e("div", { className: "phase2-panel phase2-form" },
              e("h4", null, `Additional payment for debit note #${collectionDraft.id}`),
              e(Field, { label: "Additional amount received ₹", value: collectionDraft.amount, type: "number", min: "0.01", step: "0.01", onChange: (value) => setCollectionDraft({ ...collectionDraft, amount: value }) }),
              e(Field, { label: "Received date", value: collectionDraft.receivedOn, type: "date", onChange: (value) => setCollectionDraft({ ...collectionDraft, receivedOn: value }) }),
              e(Field, { label: "Payment mode", value: collectionDraft.mode, options: [["upi", "UPI"], ["cash", "Cash"], ["card", "Card"], ["bank_transfer", "Bank transfer"]], onChange: (value) => setCollectionDraft({ ...collectionDraft, mode: value }) }),
              e(Field, { label: "Additional payment reference", value: collectionDraft.reference, onChange: (value) => setCollectionDraft({ ...collectionDraft, reference: value }) }),
              e("label", null, e("input", { type: "checkbox", checked: collectionDraft.paymentConfirmed || false, onChange: (event) => setCollectionDraft({ ...collectionDraft, paymentConfirmed: event.target.checked }) }), " I verified that this payment was received."),
              e("button", { className: "btn-admin btn-admin-primary", disabled: busy || !collectionDraft.amount || !collectionDraft.reference.trim() || !collectionDraft.paymentConfirmed, onClick: async () => { const result = await doAction("record_invoice_adjustment_collection", collectionDraft, "Additional payment recorded."); if (result) setCollectionDraft(null); } }, "Record additional payment"))),
          sale.status === "issued" && canAdmin && e("div", { className: "phase2-panel phase2-form" },
            e("h3", null, "Audited correction log"),
            e("p", null, "Use this log for nonfinancial corrections. Amount changes use the linked credit/debit note flow above."),
            e(Field, { label: "Delivery email (changes are audited; PDF stays fixed)", value: deliveryEmail, type: "email", onChange: setDeliveryEmail }),
            e("button", { className: "btn-admin btn-admin-secondary", disabled: busy || !deliveryEmail || deliveryEmail === sale.customerEmail, onClick: () => doAction("set_invoice_delivery_email", { id: sale.id, email: deliveryEmail }, "Delivery email updated and logged. Use Send / retry email above.") }, "Update delivery email"),
            e(Field, { label: "Correction note", value: correctionNote, multiline: true, onChange: setCorrectionNote }),
            e("button", { className: "btn-admin btn-admin-secondary", disabled: busy || correctionNote.trim().length < 10, onClick: async () => { const result = await doAction("record_invoice_correction", { id: sale.id, note: correctionNote }, "Correction recorded."); if (result) setCorrectionNote(""); } }, "Record correction"),
            (sale.corrections || []).map((log, index) => e("p", { key: index }, `${log.createdAt} · ${log.createdBy}: ${log.note}`))))));
  }
  window.PawpadInvoiceAdminTab = InvoiceAdminTab;
})(window);
