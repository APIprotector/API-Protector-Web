# To learn more about how to use Nix to configure your environment
# see: https://developers.google.com/idx/guides/customize-idx-env
{ pkgs, ... }: {
  # Which nixpkgs channel to use.
  channel = "stable-24.05"; # or "unstable"
  services.docker.enable = true;

  # Use https://search.nixos.org/packages to find packages
  packages = [
    pkgs.jdk21
    pkgs.maven
    pkgs.nodejs_20
  ];

  # Sets environment variables in the workspace
  env = {};
  idx = {
    # Search for the extensions you want on https://open-vsx.org/ and use "publisher.id"
    extensions = [
      "vscodevim.vim"
      "redhat.java"
      "vscjava.vscode-java-debug"
      "vscjava.vscode-java-dependency"
      "vscjava.vscode-java-pack"
      "vscjava.vscode-java-test"
      "vscjava.vscode-maven"
      "Pivotal.vscode-boot-dev-pack"
      "vmware.vscode-spring-boot"
      "vscjava.vscode-spring-boot-dashboard"
      "vscjava.vscode-spring-initializr"
      "java-extension-pack-jdk"
    ];

    # Enable previews
    previews = {
      enable = true;
      previews = {
        web = {
          command = ["mvn" "spring-boot:run" "-Dspring-boot.run.jvmArguments=-Dserver.port=$PORT"];
          manager = "web";
          env = {
            PORT = "$PORT";
          };
        };
      };
    };

    # Workspace lifecycle hooks
    workspace = {
      # Runs when a workspace is first created
      onCreate = {
        install = "mvn clean install";
        npm-install = "cd frontend && npm install";
      };
      onStart = {
        # run-server = "PORT=3000 mvn spring-boot:run";
      };
    };
  };
}
