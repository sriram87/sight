//----------------------------------*-C++-*----------------------------------//
// Copyright 2009 Lawrence Livermore National Security, LLC
// All rights reserved.
//---------------------------------------------------------------------------//

// This work performed under the auspices of the U.S. Department of Energy by
// Lawrence Livermore National Laboratory under Contract DE-AC52-07NA27344

//  DISCLAIMER
//  This work was prepared as an account of work sponsored by an agency of the
//  United States Government. Neither the United States Government nor the
//  Lawrence Livermore National Security, LLC, nor any of their employees,
//  makes any warranty, express or implied, including the warranties of
//  merchantability and fitness for a particular purpose, or assumes any
//  legal liability or responsibility for the accuracy, completeness, or
//  usefulness of any information, apparatus, product, or process disclosed,
//  or represents that its use would not infringe privately owned rights.

#ifndef __shave_hh__
#define __shave_hh__

#include <cmath>
#include <utility>

namespace IMC_namespace
{

/*! \brief  Shave double precision number to N_digits of accuracy.

  This is done in cases where a number was generated by adding up numbers
  in a different order on different numbers of processors, and so might
  have different lower bits, which we want to remove.
 */

inline double shave( double x )
{
    if( x == 0.0 )
        return 0.0;

    int sign = 1;
    if( x < 0.0 )
    {
        x = -x;
        sign = -1;
    }

    const int N_digits = 7;

//    truncate base 10 exponent
    int n = static_cast<int>( std::log10( x ) );

    double scale = std::pow( 10.0,  n-N_digits );
    ASSERT( scale > 0.0 );

//    now x is scaled to 10**N_digits
    double scaled_x = x/scale;

//    now shave off part < 1
    ASSERT( scaled_x > 0.0 );
    unsigned long long scaled_x_shaved =
        static_cast<unsigned long long>(scaled_x + 0.5);

//    now get back to the right magnitude
    return scaled_x_shaved*scale*sign;
}

}

#endif    //    __shave_hh__