window.__ModuleLoader__.load({
	id: "dsh-tool-comfyui",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");

		/** Dictionary namespace owned by this plugin's settings surfaces. */
		const NS = "settings.comfyui";
		/** `plugins.row.config` key: `<package name>#<row id>`. */
		const ROW_KEY = "dsh-tool-comfyui#tool-comfyui";
		/** Host settings entry edited by this card. */
		const ENTRY = "tool-comfyui";
		/** Settings navigation entry for the ComfyUI page. */
		const SECTION_ID = "comfyui";

		const zh = {
			title: "ComfyUI",
			description: "在 dsh 里一句话调用本机/局域网 ComfyUI 出图；这里管理机队与出图参数。",
			unavailable: "当前部署未向此客户端提供该配置。",
			readOnly: "该配置为只读，无法保存。",
			saveFailed: "本部署没有接受这些值，已保留供你修改。",
			save: "保存",
			saving: "保存中…",
			workers: "机队 (workers)",
			workersHint: "每行一条：id | url | 备注；按顺序取第一个健康的 worker。",
			workersPlaceholder: "local5090 | http://127.0.0.1:8188 | 主力机",
			workersInvalid: "每行格式应为 id | url | 备注，且 id、url 不得为空。",
			workflowsDir: "工作流模板目录",
			workflowsDirHint: "存放 <名字>.json（ComfyUI API 格式）的目录。",
			defaultWorkflow: "默认工作流",
			defaultWorkflowHint: "不传 workflow 参数时使用哪个模板。",
			outputDir: "成图输出目录",
			outputDirHint: "下载的图片保存到此目录。",
			timeoutMs: "单次调用超时 (ms)",
			timeoutMsHint: "等待 GPU 出图的协作超时预算。",
			pollIntervalMs: "轮询间隔 (ms)",
			pollIntervalMsHint: "轮询 /history 的间隔。",
			maxBatchSize: "单次最大出图数",
			maxBatchSizeHint: "一次调用最多允许生成几张。",
			generate: "启用 comfyui_generate",
			generateHint: "注册出图工具。",
			status: "启用 comfyui_status",
			statusHint: "注册机队状态工具。",
			queue: "启用 comfyui_queue",
			queueHint: "注册队列查询/清空工具。",
			overridden: "已覆盖",
			reset: "重置",
			invalidNumber: "请输入有效数字"
		};
		const en = {
			title: "ComfyUI",
			description: "Generate images in dsh by calling your local/LAN ComfyUI; manage the fleet and generation parameters here.",
			unavailable: "This deployment does not expose that configuration to this client.",
			readOnly: "This configuration is read-only and cannot be saved.",
			saveFailed: "The deployment did not accept these values; they were left for you to correct.",
			save: "Save",
			saving: "Saving…",
			workers: "Workers",
			workersHint: "One per line: id | url | label; the first healthy worker is used in order.",
			workersPlaceholder: "local5090 | http://127.0.0.1:8188 | main",
			workersInvalid: "Use id | url | label per line; id and url must not be empty.",
			workflowsDir: "Workflow templates directory",
			workflowsDirHint: "Directory holding <name>.json (ComfyUI API format) templates.",
			defaultWorkflow: "Default workflow",
			defaultWorkflowHint: "Which template to use when workflow is omitted.",
			outputDir: "Output directory",
			outputDirHint: "Downloaded images are saved into this directory.",
			timeoutMs: "Call timeout (ms)",
			timeoutMsHint: "Cooperative timeout budget while waiting for the GPU.",
			pollIntervalMs: "Poll interval (ms)",
			pollIntervalMsHint: "Interval between /history polls.",
			maxBatchSize: "Max images per call",
			maxBatchSizeHint: "Upper bound on images one call may generate.",
			generate: "Enable comfyui_generate",
			generateHint: "Register the generation tool.",
			status: "Enable comfyui_status",
			statusHint: "Register the fleet status tool.",
			queue: "Enable comfyui_queue",
			queueHint: "Register the queue inspect/clear tool.",
			overridden: "Overridden",
			reset: "Reset",
			invalidNumber: "Enter a valid number"
		};

		/** Serialize the Host `workers` array as `id | url | label` lines. */
		function formatWorkers(value) {
			if (!Array.isArray(value)) return "";
			return value.map((worker) => [worker.id, worker.url, worker.label ?? ""].join(" | ")).join("\n");
		}

		/** Parse `id | url | label` lines back into the Host `workers` array. */
		function parseWorkers(text) {
			const lines = String(text).split(/\r?\n/u).map((line) => line.trim()).filter((line) => line.length > 0);
			const workers = [];
			for (const line of lines) {
				const parts = line.split("|").map((part) => part.trim());
				const id = parts[0] ?? "";
				const url = parts[1] ?? "";
				if (parts.length > 3 || id.length === 0 || url.length === 0) return undefined;
				const worker = { id, url };
				if (parts[2]) worker.label = parts[2];
				workers.push(worker);
			}
			return workers;
		}

		/** One multi-line `workers` field whose value is a structured Host array. */
		function settingsWorkersField(field) {
			return {
				field,
				format: formatWorkers,
				parse(text) {
					const workers = parseWorkers(text);
					return workers === undefined ? undefined : { kind: "set", value: workers };
				}
			};
		}

		/** A boolean field stored as on/off draft text by `SettingsValueField`. */
		function settingsBooleanField(field) {
			return {
				field,
				format: (value) => value === true ? "on" : "off",
				parse: (text) => ({ kind: "set", value: text === "on" })
			};
		}

		/**
		 * The ComfyUI row's staged form over the Host entry, using the shared
		 * settings model so draft state, override badges, and atomic saves follow
		 * the same contract as DSH's built-in settings pages.
		 */
		class ComfyCardController {
			constructor(scope) {
				this.form = new _deepseek_ai_dsh_client_ui_primitives.SettingsFormModel(scope, [
					settingsWorkersField("workers"),
					_deepseek_ai_dsh_client_ui_primitives.settingsTextField("workflowsDir"),
					_deepseek_ai_dsh_client_ui_primitives.settingsTextField("defaultWorkflow"),
					_deepseek_ai_dsh_client_ui_primitives.settingsTextField("outputDir"),
					_deepseek_ai_dsh_client_ui_primitives.settingsNumberField("timeoutMs"),
					_deepseek_ai_dsh_client_ui_primitives.settingsNumberField("pollIntervalMs"),
					_deepseek_ai_dsh_client_ui_primitives.settingsNumberField("maxBatchSize"),
					settingsBooleanField("generate"),
					settingsBooleanField("status"),
					settingsBooleanField("queue")
				]);
				this.store = this.form.bind(() => this.projection());
			}

			projection() {
				return {
					...this.form.shell(),
					workers: this.form.field("workers"),
					workflowsDir: this.form.field("workflowsDir"),
					defaultWorkflow: this.form.field("defaultWorkflow"),
					outputDir: this.form.field("outputDir"),
					timeoutMs: this.form.field("timeoutMs"),
					pollIntervalMs: this.form.field("pollIntervalMs"),
					maxBatchSize: this.form.field("maxBatchSize"),
					generate: this.form.field("generate"),
					status: this.form.field("status"),
					queue: this.form.field("queue")
				};
			}

			inject() {
				return {
					hooks: { comfyCard: this.store },
					...this.form.actions()
				};
			}

			dispose() {
				this.form.dispose();
			}
		}

		/** Shared renderer for the ComfyUI settings form. */
		function renderSettingsForm(props, state) {
			const { t } = props;
			const disabled = !state.writable;

			return (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.SettingsForm, {
				labels: {
					unavailable: t("unavailable"),
					readOnly: t("readOnly"),
					saveFailed: t("saveFailed"),
					save: t("save"),
					saving: t("saving")
				},
				state,
				onSave: props.save,
				onDiscard: props.discard,
				children: [
					(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SettingsValueField, {
						id: "plugin-config-comfyui-workers",
						label: t("workers"),
						hint: t("workersHint"),
						placeholder: t("workersPlaceholder"),
						overriddenLabel: t("overridden"),
						resetLabel: t("reset"),
						invalidLabel: t("workersInvalid"),
						disabled,
						...state.workers,
						onEdit: (text) => props.edit("workers", text),
						onReset: () => props.resetField("workers")
					}),
					(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SettingsValueField, {
						id: "plugin-config-comfyui-workflowsdir",
						label: t("workflowsDir"),
						hint: t("workflowsDirHint"),
						overriddenLabel: t("overridden"),
						resetLabel: t("reset"),
						invalidLabel: t("invalidNumber"),
						disabled,
						...state.workflowsDir,
						onEdit: (text) => props.edit("workflowsDir", text),
						onReset: () => props.resetField("workflowsDir")
					}),
					(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SettingsValueField, {
						id: "plugin-config-comfyui-defaultworkflow",
						label: t("defaultWorkflow"),
						hint: t("defaultWorkflowHint"),
						overriddenLabel: t("overridden"),
						resetLabel: t("reset"),
						invalidLabel: t("invalidNumber"),
						disabled,
						...state.defaultWorkflow,
						onEdit: (text) => props.edit("defaultWorkflow", text),
						onReset: () => props.resetField("defaultWorkflow")
					}),
					(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SettingsValueField, {
						id: "plugin-config-comfyui-outputdir",
						label: t("outputDir"),
						hint: t("outputDirHint"),
						overriddenLabel: t("overridden"),
						resetLabel: t("reset"),
						invalidLabel: t("invalidNumber"),
						disabled,
						...state.outputDir,
						onEdit: (text) => props.edit("outputDir", text),
						onReset: () => props.resetField("outputDir")
					}),
					(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SettingsValueField, {
						id: "plugin-config-comfyui-timeoutms",
						label: t("timeoutMs"),
						hint: t("timeoutMsHint"),
						numeric: true,
						overriddenLabel: t("overridden"),
						resetLabel: t("reset"),
						invalidLabel: t("invalidNumber"),
						disabled,
						...state.timeoutMs,
						onEdit: (text) => props.edit("timeoutMs", text),
						onReset: () => props.resetField("timeoutMs")
					}),
					(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SettingsValueField, {
						id: "plugin-config-comfyui-pollintervalms",
						label: t("pollIntervalMs"),
						hint: t("pollIntervalMsHint"),
						numeric: true,
						overriddenLabel: t("overridden"),
						resetLabel: t("reset"),
						invalidLabel: t("invalidNumber"),
						disabled,
						...state.pollIntervalMs,
						onEdit: (text) => props.edit("pollIntervalMs", text),
						onReset: () => props.resetField("pollIntervalMs")
					}),
					(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SettingsValueField, {
						id: "plugin-config-comfyui-maxbatchsize",
						label: t("maxBatchSize"),
						hint: t("maxBatchSizeHint"),
						numeric: true,
						overriddenLabel: t("overridden"),
						resetLabel: t("reset"),
						invalidLabel: t("invalidNumber"),
						disabled,
						...state.maxBatchSize,
						onEdit: (text) => props.edit("maxBatchSize", text),
						onReset: () => props.resetField("maxBatchSize")
					}),
					(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Checkbox, {
						label: t("generate"),
						checked: state.generate.text === "on",
						disabled,
						onChange: (next) => props.edit("generate", next ? "on" : "off")
					}),
					(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Checkbox, {
						label: t("status"),
						checked: state.status.text === "on",
						disabled,
						onChange: (next) => props.edit("status", next ? "on" : "off")
					}),
					(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Checkbox, {
						label: t("queue"),
						checked: state.queue.text === "on",
						disabled,
						onChange: (next) => props.edit("queue", next ? "on" : "off")
					})
				]
			});
		}

		/**
		 * The ComfyUI row's configuration card on the Plugins page. The page
		 * supplies the form state, actions, and locale; this component only stages
		 * and renders the controls.
		 */
		function ComfyCard(props) {
			const { t } = props;
			const state = props.useComfyCard((snapshot) => snapshot);
			if (props.view === "summary") return t("description");
			return renderSettingsForm(props, state);
		}

		/**
		 * The standalone ComfyUI page inside the Settings navigation. It exposes
		 * the same form as the Plugins page card.
		 */
		function ComfySettingsSection(props) {
			const { t } = props;
			const state = props.useComfyCard((snapshot) => snapshot);
			return renderSettingsForm(props, state);
		}

		/** Required services (cordis fiber inject). */
		const inject = ["slots", "locale", "configForms"];

		/**
		 * Register both configuration surfaces unconditionally: the standalone
		 * Settings page and the Plugins page row card. The form itself reports an
		 * unavailable namespace instead of the whole entry vanishing, so the
		 * Settings navigation always carries the ComfyUI page.
		 * @param ctx - the browser plugin context.
		 */
		function apply(ctx) {
			const t = ctx.locale.bind(NS);
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-tool-comfyui: dictionaries");
			const controller = new ComfyCardController(ctx.configForms.get(ENTRY));
			ctx.effect(() => () => controller.dispose(), "dsh-tool-comfyui: form subscription");
			ctx.effect(() => ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: SECTION_ID,
				order: 120,
				label: () => t("title"),
				locale: NS,
				inject: () => controller.inject()
			}, ComfySettingsSection)), "dsh-tool-comfyui: settings page");
			ctx.effect(() => ctx.slots.inject("plugins.row.config", () => ctx.slots.register({
				name: "plugins.row.config",
				key: ROW_KEY,
				locale: NS,
				inject: () => controller.inject()
			}, ComfyCard)), "dsh-tool-comfyui: plugins row card");
		}

		exports.NS = NS;
		exports.ROW_KEY = ROW_KEY;
		exports.SECTION_ID = SECTION_ID;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
