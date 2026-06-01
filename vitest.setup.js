// Plain JS setup — initializes Angular TestBed with zoneless change detection.
// Uses .js instead of .ts because the Angular compiler transform silently drops
// .ts setup files that are outside the Angular project source roots.
import { getTestBed } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';

getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting(), {
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});
