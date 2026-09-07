const validateInstall = require('../../scripts/validate-install');

function cordovaContext(variables = {}) {
  return {
    cmdLine: 'cordova plugin add cordova-plugin-reteno',
    opts: {
      plugin: { variables },
      projectRoot: __dirname,
    },
  };
}

describe('validate-install hook', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('accepts RETENO_ACCESS_KEY', () => {
    expect(() =>
      validateInstall(cordovaContext({ RETENO_ACCESS_KEY: 'reteno-key' }))
    ).not.toThrow();
  });

  it('accepts the deprecated SDK_ACCESS_KEY alias', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() =>
      validateInstall(cordovaContext({ SDK_ACCESS_KEY: 'legacy-key' }))
    ).not.toThrow();
    expect(warn).toHaveBeenCalledWith(
      'cordova-plugin-reteno: SDK_ACCESS_KEY is deprecated; use RETENO_ACCESS_KEY instead.'
    );
  });

  it('prefers RETENO_ACCESS_KEY when both names are provided', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    validateInstall(
      cordovaContext({
        RETENO_ACCESS_KEY: 'reteno-key',
        SDK_ACCESS_KEY: 'legacy-key',
      })
    );

    expect(warn).not.toHaveBeenCalled();
  });

  it('rejects missing access keys', () => {
    expect(() => validateInstall(cordovaContext())).toThrow(
      'cordova-plugin-reteno: RETENO_ACCESS_KEY is required'
    );
  });
});
