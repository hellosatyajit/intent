import { Injectable } from "@nestjs/common";
import { Command, ConsoleIO } from "../console";
import { CodegenService } from "./service";
import { Str } from "../utils/string";
import { getClassNamesFromFilePath } from "./utils";
import { join } from "path";

@Injectable()
export class CodegenCommand {
  constructor(private service: CodegenService) {}

  @Command("make:config {namespace}", { desc: "Command to make config" })
  async makeConfig(_cli: ConsoleIO): Promise<void> {
    const namespace = _cli.argument<string>("namespace");
    // convert the namespace to camelcase for file name.
    const fileNameWithoutEx = Str.camel(namespace);
    const fileNameWithEx = `${fileNameWithoutEx}.ts`;
    const filePath = `config/${fileNameWithEx}`;
    const options = {
      input: { namespace },
      filePath,
      fileNameWithoutEx,
      fileNameWithEx,
    };

    try {
      await this.service.createConfigFile(options);
      _cli.success(`Successfully created ${filePath}`);
    } catch (e) {
      _cli.error(e["message"]);
      return;
    }
  }

  @Command("make:controller {name}", { desc: "Command to create a controller" })
  async makeController(_cli: ConsoleIO): Promise<void> {
    _cli.info("Creating controller");
    const name = _cli.argument<string>("name");
    const routeName = name;
    const controllerName = Str.pascal(`${name}_controller`);
    const fileNameWithoutEx = Str.camel(`${name}_controller`);
    const filePath = `app/controllers/${fileNameWithoutEx}.ts`;
    const options = {
      input: { routeName, controllerName },
      filePath,
      fileNameWithoutEx,
    };
    try {
      await this.service.createController(options);
      _cli.success(`Successfully created ${filePath}`);
    } catch (e) {
      _cli.error(e["message"]);
      return;
    }
  }

  @Command("make:service {name}", { desc: "Command to create a service" })
  async makeService(_cli: ConsoleIO): Promise<void> {
    _cli.info("Creating service class");
    const name = _cli.argument<string>("name");
    const className = Str.pascal(`${name}_service`);
    const fileNameWithoutEx = Str.camel(`${name}_service`);
    const filePath = `app/services/${fileNameWithoutEx}.ts`;
    const options = { input: { className }, filePath, fileNameWithoutEx };
    try {
      await this.service.createService(options);
      _cli.success(`Successfully created ${filePath}`);
    } catch (e) {
      _cli.error(e["message"]);
      return;
    }
  }

  @Command("make:model {name}", { desc: "Command to create a model" })
  async makeModel(_cli: ConsoleIO): Promise<void> {
    _cli.info("Creating model class");
    const name = _cli.argument<string>("name");
    const className = Str.pascal(`${name}_model`);
    const fileNameWithoutEx = Str.camel(`${name}_model`);
    const filePath = `app/models/${fileNameWithoutEx}.ts`;
    const options = { input: { className }, filePath, fileNameWithoutEx };
    try {
      await this.service.createModel(options);
      _cli.success(`Successfully created ${filePath}`);
    } catch (e) {
      _cli.error(e["message"]);
      return;
    }
  }

  @Command("make:repo {repoName} {modelFileName} {--without-interface}", {
    desc: "Command to create a repo",
  })
  async makeRepository(_cli: ConsoleIO): Promise<void> {
    _cli.info("Creating db repository class");
    const repoName = _cli.argument<string>("repoName");
    const repoClassName = Str.pascal(`${repoName}_Db_Repository`);
    const fileNameWithoutEx = Str.camel(`${repoName}_Db_Repository`);
    const filePath = `app/repositories/${fileNameWithoutEx}.ts`;
    const repoToken = Str.upper(`${repoName}_DB_REPO`);
    const modelFileName = _cli.argument<string>("modelFileName");
    const relativeModelFilePath = `../models/${modelFileName}`;
    const modelName = getClassNamesFromFilePath(
      join("app", `${relativeModelFilePath}.ts`)
    )[0];

    const options = {
      input: {
        className: repoClassName,
        modelFilePath: relativeModelFilePath,
        modelName,
      },
      repoToken,
      filePath,
      fileNameWithoutEx,
    };

    try {
      await this.service.createRepo(options);
      _cli.success(`Successfully created ${filePath}`);
    } catch (e) {
      _cli.error(e["message"]);
      return;
    }
  }
}
