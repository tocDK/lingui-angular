import { plural, select, t } from '@lingui/core/macro';
// @source: params.html:1:7
void t({ message: "Hello, {name}" });
// @source: params.html:2:7
void t({ message: "Open", context: "verb" });
// @source: params.html:3:7
void t({ message: "Welcome", id: "auth.welcome" });
// @source: params.html:4:7
void t({ message: "Open, {name}", context: "verb" });
