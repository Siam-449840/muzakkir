module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^expo-notifications$': '<rootDir>/jest.setup.js',
    '^expo-sqlite$': '<rootDir>/jest.setup.js',
    // expo-av is deprecated and removed — replaced by expo-audio
    '^expo-av$': '<rootDir>/jest.setup.js',
    '^expo-audio$': '<rootDir>/jest.setup.js',
    '^@react-native-async-storage/async-storage$': '<rootDir>/jest.setup.js',
    '^react-native$': '<rootDir>/jest.setup.js',
    '^lucide-react-native$': '<rootDir>/jest.setup.js',
    '^@react-navigation/.*$': '<rootDir>/jest.setup.js',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        target: 'es2020',
        module: 'commonjs',
        esModuleInterop: true,
        strict: true,
        resolveJsonModule: true
      }
    }]
  }
};
