// A TypeDoc plugin for the spp command reference (typedoc.json loads it). TypeDoc's own validation only asks that an
// export has a comment; this one warns, so treatWarningsAsErrors fails the run, unless every command module has a
// @module comment and its `run` has a summary, a @param per parameter, @returns (the exit codes) and an @example.
// It also prints each command's USAGE as a text block, the same text `spp <command> --help` prints.
import { Application, Converter, type DeclarationReflection, IntrinsicType, LiteralType, type ProjectReflection, ReflectionKind } from "typedoc";

export function load(app: Application): void {
  app.converter.on(Converter.EVENT_RESOLVE_END, (context) => {
    for (const module of context.project.getChildrenByKind(ReflectionKind.Module)) {
      const usage = module.getChildByName("USAGE") as DeclarationReflection | undefined;
      if (!(usage?.type instanceof LiteralType) || typeof usage.type.value !== "string" || !usage.comment) continue;
      usage.comment.summary.push({ kind: "text", text: "\n\n" }, { kind: "code", text: "```text\n" + usage.type.value.trimEnd() + "\n```" });
      usage.type = new IntrinsicType("string");
      usage.defaultValue = undefined;
    }
  });

  app.on(Application.EVENT_VALIDATE_PROJECT, (project: ProjectReflection) => {
    for (const module of project.getChildrenByKind(ReflectionKind.Module)) {
      const warn = (what: string) => app.logger.warn(`spp command reference: ${module.name}: ${what}`);
      if (!module.comment?.summary.length) warn("no @module comment");
      const run = module.getChildByName("run") as DeclarationReflection | undefined;
      const signature = run?.signatures?.[0];
      if (!signature) {
        warn("no exported run");
        continue;
      }
      if (!signature.comment?.summary.length) warn("run has no summary");
      for (const p of signature.parameters ?? []) if (!p.comment?.summary.length) warn(`run has no @param for ${p.name}`);
      for (const tag of ["@returns", "@example"] as const) if (!signature.comment?.getTag(tag)) warn(`run has no ${tag}`);
    }
  });
}
